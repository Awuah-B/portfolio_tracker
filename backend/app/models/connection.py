import asyncio
import aiohttp
import ssl
import certifi
from typing import Dict, Optional, AsyncGenerator, List
import contextlib
from datetime import datetime, timezone

from app.config import CONFIG   
from app.utils.set_logs import setup_logger
from app.exceptions import DatabaseError, ConfigurationError

logger = setup_logger('database.log')

class SupabaseConnectionManager:
    """Manages Supabase connections with pooling and retry logic"""

    def __init__(self):
        self._connection_pool = []
        self._max_pool_size = 5
        self._connection_timeout = 60  
        self._retry_attempts = 5  
        self._retry_delay = 2  
        self._health_check_interval = 300  # 5mins
        self._background_tasks = set()
        self._start_background_tasks()

    def _start_background_tasks(self) -> None:
        """Start background monitoring tasks"""
        task = asyncio.create_task(self._connection_monitor())
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)
    

    async def _connection_monitor(self) -> None:
        """Background task to monitor connection health"""
        while True:
            try:
                await asyncio.sleep(self._health_check_interval)
                await self._health_check()
            except Exception as e:
                logger.error(f"Connection monitor error: {e}")

    async def _health_check(self) -> None:
        """Perform health check on database connection"""
        try:
            async with self.get_connection() as conn:
                # Create SSL context with proper certificate verification
                ssl_context = ssl.create_default_context(cafile=certifi.where())
                connector = aiohttp.TCPConnector(ssl=ssl_context)
                
                async with aiohttp.ClientSession(connector=connector) as session:
                    async with session.get(
                        f"{conn['url']}/rest/v1/",
                        headers=conn['headers'],
                        timeout=aiohttp.ClientTimeout(total=self._connection_timeout)
                    ) as response:
                        if response.status == 404:
                            logger.warning(f"Health check failed with status {response.status} - Invalid URL")
                        elif response.status == 401:
                            logger.warning(f"Health check failed with status {response.status} - Authentication issue")
                        elif response.status != 200:
                            logger.warning(f"Health check failed with status {response.status}")
        except Exception as e:
            logger.warning(f"Health check failed: {e}")

    @contextlib.asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[Dict, None]:
        """Acquire a connection with retry logic"""
        conn = None
        for attempt in range(self._retry_attempts):
            try:
                # Try to get from pool first
                if self._connection_pool:
                    conn = self._connection_pool.pop()
                    if self._is_connection_valid(conn):
                        yield conn
                        self._release_connection(conn)
                        return

                # Create new connection
                conn = await self._create_connection()
                yield conn
                self._release_connection(conn)
                return
            
            except Exception as e:
                logger.warning(f"Connection attempt {attempt + 1} failed: {e}")
                if attempt < self._retry_attempts - 1:
                    await asyncio.sleep(self._retry_delay * (attempt + 1))
        
        raise DatabaseError(f"Failed to establish connection after {self._retry_attempts} attempts")
    
    async def _create_connection(self) -> Dict:
        """Create a new Supabase connection"""
        url = CONFIG.supabase.url
        key = CONFIG.supabase.service_role_key or CONFIG.supabase.anon_key

        if not url or not key:
            raise ConfigurationError("Missing Supabase credentials")
        
        headers = {
            'apikey': key,
            'Authorization': f"Bearer {key}",
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }

    # Test connection
        # Create SSL context with proper certificate verification
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(
                f"{url}/rest/v1/",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=self._connection_timeout)
            ) as response:
                # Supabase returns 401 without auth, 200 with auth, or 404 for invalid URLs
                if response.status == 404:
                    raise DatabaseError(f"Connection test failed with status {response.status} - Invalid URL")
                elif response.status == 401:
                    # 401 is expected without proper headers, but we have headers so this might indicate auth issue
                    logger.warning(f"Connection test returned 401 - checking if this is expected")
                elif response.status != 200:
                    raise DatabaseError(f"Connection test failed with status {response.status}")
                else:
                    logger.info("Connection test successful - SSL verification working correctly")
        
        return {
            'url': url,
            'headers': headers,
            'created_at': datetime.now(),
            'last_used': datetime.now()
        }    

    def _is_connection_valid(self, conn: Dict) -> bool:
        """Check if connection is still valid"""
        # Check age (connections expire after 1 hour)
        age = datetime.now() - conn.get('created_at', datetime.now())
        return age.total_seconds() < 3600
    
    def _release_connection(self, conn: Dict) -> None:
        """Return connection to pool if space available"""
        if len(self._connection_pool) < self._max_pool_size and self._is_connection_valid(conn):
            conn['last_used'] = datetime.now()
            self._connection_pool.append(conn)

    async def close_all(self) -> None:
        """Cleanup all connections and background tasks"""
        for task in self._background_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self._background_tasks:
            await asyncio.gather(*self._background_tasks, return_exceptions=True)
        
        # Clear connection pool
        self._connection_pool.clear()
        logger.info('All connections closed')

class SupabaseHandler:
    """Supabase database handler"""

    def __init__(self):
        self.conn_manager = SupabaseConnectionManager()
    
    