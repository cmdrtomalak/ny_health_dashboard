# Server-Side Storage Implementation Plan
## NY Health Dashboard - Client-Side IndexDB to Server-Side SQLite Migration

### 📋 Executive Summary

This implementation plan outlines the migration of the NY Health Dashboard from client-side IndexDB storage to a server-side SQLite database with intelligent caching, automated data synchronization, and efficient CSV timestamp-based updates.

### 🏗️ Current Architecture Analysis

#### Client-Side Data Flow (Current)
```
Frontend React App
├── IndexedDB (idb-keyval)
│   ├── Dashboard Data Cache
│   ├── Vaccination Data Cache  
│   └── Individual Service Caches
├── External APIs
│   ├── NYS Open Data (Vaccination, Wastewater)
│   ├── CDC NNDSS (Disease Statistics)
│   ├── NYC Open Data (COVID Cases)
│   ├── Delphi CMU (Flu ILI)
│   ├── NYC Health GitHub (Childhood Vaccines CSV)
│   ├── CDC HAN RSS (News)
│   ├── NYC DoH Website (News - Scraped)
│   └── NY State of Health (News - Scraped)
└── Cache Refresh Logic (10 AM local time)
```

#### Data Sources Identified
1. **Vaccination Data**
   - NYS API: `https://health.data.ny.gov/resource/xrhr-cy84.json` (Flu/COVID doses)
   - NYC GitHub CSV: `https://raw.githubusercontent.com/nychealth/immunization-data/main/demo/Main_Routine_Vaccine_Demo.csv`

2. **Disease Statistics**
   - CDC NNDSS: `https://data.cdc.gov/resource/x9gk-5huc.json`
   - NYC COVID: `https://data.cityofnewyork.us/resource/rc75-m7u3.json`
   - Delphi Flu: `https://api.delphi.cmu.edu/epidata/fluview/`

3. **Wastewater Data**
   - NYS Wastewater: `https://health.data.ny.gov/resource/hdxs-icuh.json`

4. **News Data**
   - CDC RSS: `https://tools.cdc.gov/api/v2/resources/media/132608.rss`
   - NYC News (Scraped): `https://www.nyc.gov/site/doh/about/press/recent-press-releases.page`
   - NYS News (Scraped): `https://info.nystateofhealth.ny.gov/news`

### 🎯 Target Architecture

#### Server-Side Data Flow (Proposed)
```
Backend (Node.js + Express + SQLite)
├── SQLite Database
│   ├── dashboard_cache (master cache table)
│   ├── vaccination_data (processed vaccination stats)
│   ├── disease_stats (processed disease data)
│   ├── wastewater_data (processed wastewater samples)
│   ├── news_data (processed news alerts)
│   ├── csv_cache (raw CSV files with timestamps)
│   ├── api_cache (API response cache)
│   └── sync_log (data synchronization tracking)
├── CSV Cache Layer
│   ├── Local file storage for downloaded CSVs
│   ├── Timestamp comparison logic
│   ├── Conditional re-download based on HTTP headers
│   └── Version tracking for cache invalidation
├── Data Synchronization Service
│   ├── Scheduled updates (10 AM daily)
│   ├── Manual refresh triggers
│   ├── Concurrent data fetching
│   ├── Data processing pipelines
│   └── Error handling and retry logic
└── REST API Endpoints
    ├── GET /api/dashboard (full dashboard data)
    ├── POST /api/refresh (manual refresh trigger)
    │   ├── Rate limited: Max 3/hour per IP
    │   ├── Buffered: Excess requests scheduled for next hour
    │   ├── Admin bypass: `/api/refresh?admin=true` 
    │   └── Response: `{"status": "immediate"|"buffered"|"scheduled_for": "2025-01-03T11:00:00Z"}`
    ├── GET /api/status (sync status and metadata)
    ├── GET /api/refresh/queue (view buffered requests)
    ├── DELETE /api/refresh/:requestId (cancel buffered request)
    └── WebSocket /ws (real-time updates)

Frontend React App
├── API Client (fetch instead of IndexDB)
├── Real-time WebSocket connection
├── Local fallback cache (minimal, for offline)
└── Sync status indicators
```

### 📊 Database Schema Design

#### Core Tables

```sql
-- Master dashboard cache
CREATE TABLE dashboard_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_json TEXT NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_stale BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CSV file cache with metadata
CREATE TABLE csv_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    local_path TEXT NOT NULL,
    remote_last_modified TEXT, -- HTTP Last-Modified header
    remote_etag TEXT,          -- HTTP ETag header
    local_file_hash TEXT,       -- SHA256 of local file
    download_count INTEGER DEFAULT 1,
    last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(url, remote_last_modified, remote_etag)
);

-- Synchronization tracking
CREATE TABLE sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT NOT NULL, -- 'scheduled', 'manual', 'buffered'
    data_source TEXT,        -- 'vaccination', 'disease', etc.
    status TEXT NOT NULL,     -- 'success', 'failed', 'partial'
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER,
    triggered_by TEXT,        -- 'system', 'user', 'admin'
    source_ip TEXT,           -- Origin of manual request
    user_id TEXT,             -- Optional user identifier
    was_rate_limited BOOLEAN DEFAULT FALSE,
    scheduled_at DATETIME,    -- When buffered request was scheduled
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Manual refresh rate limiting and buffering
CREATE TABLE manual_refresh_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    source_ip TEXT NOT NULL,
    user_id TEXT,
    request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    scheduled_for DATETIME,    -- NULL if immediate execution
    executed BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    websocket_connection_id TEXT, -- For real-time user notifications
    request_data TEXT,        -- JSON of original request
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting hourly tracking
CREATE TABLE rate_limit_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour_window DATETIME NOT NULL, -- Truncated to hour
    request_count INTEGER DEFAULT 1,
    source_ip TEXT NOT NULL,
    last_request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hour_window, source_ip)
);

-- Individual data tables (examples)
CREATE TABLE vaccination_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region TEXT NOT NULL,     -- 'nyc', 'nys'
    vaccine_name TEXT NOT NULL,
    current_year REAL,
    five_years_ago REAL,
    ten_years_ago REAL,
    last_available_rate REAL,
    last_available_date TEXT,
    collection_method TEXT,
    source_url TEXT,
    calculation_details TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disease_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    current_count INTEGER,
    week_ago_count INTEGER,
    month_ago_count INTEGER,
    two_months_ago_count,
    year_ago_count INTEGER,
    unit TEXT,
    last_updated TEXT,
    data_source TEXT,
    source_url TEXT,
    region TEXT DEFAULT 'nyc',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 🔄 Data Synchronization Strategy

#### 1. Scheduled Updates (10 AM Daily)
```typescript
interface ScheduledSync {
    time: "10:00"; // Local server time
    timezone: "America/New_York"; // NY timezone
    retry_policy: {
        max_retries: 3,
        backoff: [5, 15, 30] // minutes
    };
    priority: "normal";
}
```

#### 2. Manual Refresh Triggers with Rate Limiting
```typescript
interface ManualRefresh {
    trigger: "user_request" | "admin_override";
    force: boolean; // Ignore cache freshness
    sources?: Array<string>; // Specific data sources to refresh
    priority: "high";
    rate_limited: boolean; // Buffer if exceeding limits
    scheduled_for?: string; // ISO timestamp if buffered
}

interface RateLimitConfig {
    max_requests_per_hour: 3;
    buffer_window_minutes: 60;
    immediate_first_request: boolean; // Allow first request instantly
    admin_override_exempt: boolean;    // Admin bypass of rate limits
}
```

#### Rate Limiting and Buffering Strategy
```typescript
interface ManualRefreshBuffer {
    // Track requests within current hour window
    current_hour_requests: Array<{
        timestamp: Date;
        user_id?: string;
        source_ip: string;
        processed: boolean;
    }>;
    
    // Queue for excess requests
    buffered_requests: Array<{
        request: ManualRefresh;
        scheduled_for: Date;
        request_id: string;
        notified_user?: string; // WebSocket connection ID
    }>;
    
    // Rate limiting rules
    limits: {
        max_per_hour: 3;
        grace_period_minutes: 5;    // Small buffer around hour boundary
        admin_bypass: true;
        burst_protection: true;     // Prevent rapid successive requests
    };
    
    // Response strategies
    responses: {
        within_limit: "Execute immediately";
        exceeded_limit: "Schedule for next hour";
        admin_request: "Execute immediately (bypass limits)";
        burst_detected: "Reject with 429 Too Many Requests";
    };
}
```

#### 3. Real-time Updates via WebSocket
```typescript
interface WebSocketUpdate {
    type: "data_update" | "sync_status" | "error";
    payload: any;
    timestamp: string;
    broadcast: boolean; // Send to all connected clients
}
```

### 📁 CSV Caching System

#### Timestamp Comparison Logic
```typescript
interface CSVCacheStrategy {
    download: {
        conditional_headers: {
            "If-Modified-Since": string; // From stored timestamp
            "If-None-Match": string;     // From stored ETag
        };
        response_handling: {
            304: "Use cached copy";
            200: "Update cache and process";
            4xx/5xx: "Retry with exponential backoff";
        };
    };
    
    local_validation: {
        file_hash_comparison: boolean; // SHA256 verification
        timestamp_consistency: boolean; // Check HTTP vs file system
        corruption_detection: boolean;  // Try parsing before processing
    };
}
```

#### Cache Invalidation Conditions
1. **HTTP 304 Not Modified**: Keep existing cache
2. **HTTP 200 OK**: Download and update cache
3. **Hash Mismatch**: Force re-download even if timestamps match
4. **File Corruption**: Delete and re-download
5. **Manual Force Refresh**: Ignore all cache headers

### 🛠️ Implementation Phases

#### Phase 1: Backend Foundation (Week 1)
**Priority: Critical Path**
- [ ] Set up Node.js + Express server
- [ ] Configure SQLite database with migrations
- [ ] Implement basic API endpoints structure
- [ ] Create CSV cache service with file system storage
- [ ] Set up basic error handling and logging

#### Phase 2: Data Migration (Week 2)
**Priority: Critical Path**
- [ ] Migrate vaccination data service to server-side
- [ ] Migrate disease statistics service to server-side  
- [ ] Migrate wastewater data service to server-side
- [ ] Migrate news data service to server-side
- [ ] Implement CSV timestamp comparison logic
- [ ] Create data processing pipelines

#### Phase 3: Synchronization System (Week 3)
**Priority: High**
- [ ] Implement scheduled sync service (10 AM daily)
- [ ] Add manual refresh trigger endpoints with rate limiting
- [ ] Create manual refresh buffer system (max 3/hour)
- [ ] Implement rate limiting tracking database tables
- [ ] Create sync status tracking and logging
- [ ] Add WebSocket notifications for buffered requests
- [ ] Implement retry logic and error handling
- [ ] Add concurrent data fetching with Promise.all
- [ ] Create admin override functionality for rate limits

#### Phase 4: Real-time Updates (Week 4)
**Priority: Medium**
- [ ] Implement WebSocket server for real-time updates
- [ ] Create client-side WebSocket connection
- [ ] Add broadcast logic for data changes
- [ ] Implement connection management and reconnection

#### Phase 5: Frontend Integration (Week 5)
**Priority: High**
- [ ] Replace IndexDB API calls with HTTP requests
- [ ] Implement WebSocket client for real-time updates
- [ ] Add loading states for server requests
- [ ] Implement offline fallback with minimal cache
- [ ] Update error handling for network failures

#### Phase 6: Testing & Deployment (Week 6)
**Priority: Critical Path**
- [ ] Unit tests for all backend services
- [ ] Integration tests for API endpoints
- [ ] Load testing for concurrent users
- [ ] Deployment configuration (PM2, environment variables)
- [ ] Monitoring and alerting setup
- [ ] Documentation and runbooks

### 📦 Required Dependencies

#### Backend Dependencies
```json
{
    "express": "^4.18.0",
    "sqlite3": "^5.1.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.0.0",
    "node-cron": "^3.0.0",
    "ws": "^8.14.0",
    "papaparse": "^5.5.0",
    "axios": "^1.6.0",
    "crypto": "^1.0.1", // Built-in
    "fs/promises": "^0.1.0" // Built-in
}
```

#### Frontend Dependencies (Additions)
```json
{
    "axios": "^1.6.0", // or use native fetch
    "reconnecting-websocket": "^4.4.0"
}
```

### 🔧 Configuration Requirements

#### Environment Variables
```bash
# Database
DATABASE_PATH=/app/data/health_dashboard.db
CSV_CACHE_PATH=/app/data/csv_cache

# Server
PORT=3001
NODE_ENV=production
TZ=America/New_York

# Sync Configuration
SYNC_SCHEDULE_TIME=10:00
SYNC_RETRY_ATTEMPTS=3
SYNC_TIMEOUT=30000

# Rate Limiting Configuration
MANUAL_REFRESH_MAX_PER_HOUR=3
RATE_LIMIT_WINDOW_MINUTES=60
ADMIN_BYPASS_RATE_LIMIT=true
BUFFER_IMMEDIATE_FIRST_REQUEST=true
BURST_PROTECTION_ENABLED=true

# Cache Configuration
CACHE_TTL_HOURS=24
CSV_CACHE_MAX_SIZE_MB=500

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=100
```

#### PM2 Configuration Updates
```javascript
module.exports = {
  apps: [
    {
      name: 'health-dashboard-backend',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    },
    // Keep existing frontend config
    {
      name: 'health-dashboard-frontend',
      script: 'vite',
      args: 'preview --port 3000',
      // ... existing config
    }
  ]
};
```

### 🚨 Risk Assessment & Mitigation

#### High Risk Items
1. **Data Source Dependencies**: External APIs may change or become unavailable
   - **Mitigation**: Implement fallback data sources, caching with grace periods
   
2. **CSV Parsing Failures**: Malformed CSV data could break processing
   - **Mitigation**: Robust error handling, data validation, try-catch around parsing

3. **Database Corruption**: SQLite file corruption could lose all data
   - **Mitigation**: Regular backups, WAL mode, integrity checks

#### Medium Risk Items
1. **Performance Bottlenecks**: Concurrent users may overload server
   - **Mitigation**: Connection pooling, request rate limiting, CDN for static assets

2. **Memory Usage**: Large CSV files could exhaust memory
   - **Mitigation**: Stream processing, file size limits, monitoring

### 📈 Success Metrics

#### Performance Targets
- **Dashboard Load Time**: < 2 seconds (vs current 5-10 seconds with API fetching)
- **Data Freshness**: < 5 minutes from source update to frontend display
- **Server Response Time**: < 500ms for dashboard API calls
- **CSV Cache Hit Rate**: > 90% (avoid unnecessary downloads)
- **Uptime**: > 99.5%

#### Data Quality Targets
- **Sync Success Rate**: > 98%
- **Data Completeness**: 100% of expected data sources updated
- **Error Detection**: < 1% undetected data quality issues

### 🔄 Rollback Strategy

#### If Backend Implementation Fails
1. **Frontend Fallback**: Revert to existing IndexDB implementation
2. **Feature Flag**: Add `USE_SERVER_SIDE_STORAGE` environment variable
3. **Gradual Migration**: Allow per-feature toggling (vaccination first, etc.)
4. **Data Export**: Export existing cache for seamless transition

#### Database Migration Issues
1. **Backup Strategy**: Full SQLite backup before schema changes
2. **Migration Scripts**: Versioned database migrations with rollback capability
3. **Data Validation**: Compare pre/post migration data integrity

### 📚 Documentation Requirements

#### Technical Documentation
- [ ] API endpoint documentation with examples
- [ ] Database schema and migration guides
- [ ] Sync service configuration and troubleshooting
- [ ] Deployment and configuration guide
- [ ] Monitoring and alerting setup

#### Operational Documentation
- [ ] Daily sync monitoring checklist
- [ ] Common issues and resolution procedures
- [ ] Performance tuning guidelines
- [ ] Backup and recovery procedures

### 👥 Team Coordination

#### Development Team Tasks
**Backend Developer (Full-time)**
- Implement all server-side components
- Database design and migrations
- API development and testing
- Sync service implementation

**Frontend Developer (Part-time)**
- Replace IndexDB with HTTP client
- Implement WebSocket integration
- Update error handling and loading states
- Maintain backward compatibility

**DevOps Engineer (Part-time)**
- Deployment configuration
- Monitoring and alerting setup
- Backup and recovery procedures
- Performance optimization

#### Timeline Overview
- **Week 1**: Backend foundation setup
- **Week 2**: Data migration and processing
- **Week 3**: Synchronization system
- **Week 4**: Real-time updates
- **Week 5**: Frontend integration
- **Week 6**: Testing and deployment

### 🎯 Critical Success Factors

1. **Maintain Data Quality**: Ensure server-side data matches or exceeds current accuracy
2. **Performance Improvement**: Achieve faster load times than current client-side fetching
3. **Reliability**: Implement robust error handling and automatic recovery
4. **Scalability**: Design for multiple concurrent users
5. **Maintainability**: Clean code with comprehensive testing and documentation

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-03  
**Next Review**: 2025-01-10 or before Phase 1 completion