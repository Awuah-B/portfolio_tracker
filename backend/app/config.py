"""
Configuration management for Portfolio-Tracker
Centralized configuration with validation and environment handling.
"""
import os
from enum import Enum
from typing import List, Optional
from dataclasses import dataclass, field
from dataclasses import dataclass, field
from dotenv import load_dotenv

from app.exceptions import ConfigurationError

# Find the project root by looking for the .git directory
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dotenv_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=dotenv_path, override=True)

class Environment(Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"

@dataclass
class SupabaseConfig:
    """Supabase database configuration"""
    url: str
    anon_key: str
    service_role_key: Optional[str] = None
    project_ref: Optional[str] = None

@dataclass(frozen=True)
class MonitoringConfig:
    pass

class Config:
    """Main configuration class"""
    
    def __init__(self):
        self.env = Environment(os.getenv('ENVIRONMENT', 'development'))
        self._load_config()

    def _load_config(self) -> None:
        """Load configuration from environment variables"""
        try:
            self.supabase = SupabaseConfig(
                url=self._get_required_env("SUPABASE_URL"),
                anon_key=self._get_required_env("SUPABASE_ANON_KEY"),
                service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
                project_ref=os.getenv("SUPABASE_PROJECT_REF"),
            )
            self.database_url = self._get_required_env("DATABASE_URL")
            self.admin_password = self._get_required_env("ADMIN_PASSWORD")
            self.secret_key = self._get_required_env("SECRET_KEY")

            self.monitoring = MonitoringConfig()
            self._validate_config()
            #self._validate_monitoring_config(self.monitoring)
        except Exception as e:
            raise ConfigurationError(f"Failed to load configuration: {e}")
    
    def _get_required_env(self, key: str) -> str:
        """Get required environment variable"""
        value = os.getenv(key)
        if not value:
            raise ConfigurationError(f"Required environment variable {key} is not set")
        return value
    
    def _validate_config(self) -> None:
        """Validate configuration"""
    
        if not self.supabase.url.startswith(('http://', 'https://')):
            raise ConfigurationError("Invalid Supabase URL format")
        
        if not self.supabase.anon_key:
            raise ConfigurationError("Supabase anonymous key is required")
        
        if self.supabase.project_ref and not self.supabase.project_ref.isalnum():
            raise ConfigurationError("Invalid Supabase project reference")

    def _validate_monitoring_config(self, config: MonitoringConfig) -> None:
        pass

    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
    
        return self.env == Environment.PRODUCTION
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.env == Environment.DEVELOPMENT
    
# Global configuration instance
CONFIG = Config()