const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

console.log('--- 1. Setting defaultMcqHistory to empty array [] ---');
const oldMcqHistory = `    const defaultMcqHistory = [
      { id: 1, date: '2026-09-28', module: 'Baseline Diagnostic', score: 48, passed: false },
      { id: 2, date: '2026-10-04', module: 'Database Optimization', score: 72, passed: false },
      { id: 3, date: '2026-10-09', module: 'Production Debugging', score: 85, passed: true },
      { id: 4, date: '2026-10-12', module: 'Java & Architecture', score: 92, passed: true }
    ];`;

const newMcqHistory = `    const defaultMcqHistory = [];`;

if (indexHtml.includes(oldMcqHistory)) {
  indexHtml = indexHtml.replace(oldMcqHistory, newMcqHistory);
  console.log('✓ Replaced defaultMcqHistory with []');
} else {
  const norm1 = indexHtml.replace(/\r\n/g, '\n');
  const normOld = oldMcqHistory.replace(/\r\n/g, '\n');
  if (norm1.includes(normOld)) {
    indexHtml = norm1.replace(normOld, newMcqHistory).replace(/\n/g, '\r\n');
    console.log('✓ Replaced defaultMcqHistory with [] (normalized)');
  }
}

console.log('--- 2. Sanitizing STACK_PRESETS (fullstack, python, cloud) ---');
const oldStackPresets = `    const STACK_PRESETS = {
      java: [
        { id: 'java', name: 'Java & Multithreading', score: 35, base_percentage: 35, category: 'Backend Language', currentMilestone: 'Collections, Streams, Multithreading & OOP', nextMilestone: 'JVM Memory Tuning & Low-latency locks', youtubeUrl: 'https://www.youtube.com/watch?v=grEKMHGYyns' },
        { id: 'spring', name: 'Spring Boot & Microservices', score: 35, base_percentage: 35, category: 'Architecture', currentMilestone: 'REST APIs, JPA Entities & Dependency Injection', nextMilestone: 'Distributed Sagas & Circuit Breakers', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
        { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 35, base_percentage: 35, category: 'Databases', currentMilestone: 'Complex SQL, Transactions & Foreign Keys', nextMilestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'docker', name: 'Docker & Containers', score: 35, base_percentage: 35, category: 'Cloud Infra', currentMilestone: 'Multi-stage builds & Distroless images', nextMilestone: 'Kubernetes Pod Deployment & Helm', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'debug', name: 'Production Debugging', score: 35, base_percentage: 35, category: 'Problem Solving', currentMilestone: 'Stack trace diagnosis & unit test mocks', nextMilestone: 'Heap dump analysis & connection leak profiling', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ],
      fullstack: [
        { id: 'react', name: 'React & Next.js', score: 75, category: 'Frontend', currentMilestone: 'Hooks, Server Components & State Management', nextMilestone: 'Performance Profiling & Bundle Optimization', youtubeUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ' },
        { id: 'nodejs', name: 'Node.js & Express', score: 70, category: 'Backend Runtime', currentMilestone: 'Event loop async patterns & middleware', nextMilestone: 'Cluster Worker threads & stream buffering', youtubeUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ' },
        { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 60, category: 'Databases', currentMilestone: 'Complex SQL & Prisma Schema migrations', nextMilestone: 'Connection pooling & Index optimization', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'docker', name: 'Docker & CI/CD', score: 68, category: 'Delivery', currentMilestone: 'Containerizing Node apps & GitHub Actions', nextMilestone: 'Canary releases & automated integration tests', youtubeUrl: 'https://www.youtube.com/watch?v=pTFZFxd4hOI' },
        { id: 'debug', name: 'Production Debugging', score: 52, category: 'Problem Solving', currentMilestone: 'Browser DevTools & API network error handling', nextMilestone: 'Memory leak profiling & APM tracing', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ],
      python: [
        { id: 'python', name: 'Python Core & AsyncIO', score: 80, category: 'Language', currentMilestone: 'Generators, Decorators & Multiprocessing', nextMilestone: 'C-Extension profiling & memory optimization', youtubeUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ' },
        { id: 'fastapi', name: 'FastAPI & Microservices', score: 72, category: 'Backend Architecture', currentMilestone: 'Pydantic schemas & Async endpoints', nextMilestone: 'High-concurrency worker scaling', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
        { id: 'vector', name: 'Vector DBs (Chroma/Pinecone)', score: 65, category: '2026 Booming Tech', currentMilestone: 'Embedding generation & semantic search', nextMilestone: 'Hybrid BM25 + Vector retrieval caching', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'postgres', name: 'PostgreSQL & pgvector', score: 58, category: 'Databases', currentMilestone: 'SQL schemas & relational indices', nextMilestone: 'HNSW vector indexing & memory buffers', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'debug', name: 'Production Debugging', score: 50, category: 'Problem Solving', currentMilestone: 'Logging & unit tests with pytest', nextMilestone: 'Pipeline latency profiling & memory leaks', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ],
      cloud: [
        { id: 'golang', name: 'Go (Golang) Systems', score: 74, category: 'Language', currentMilestone: 'Goroutines, Channels & interfaces', nextMilestone: 'Race detector profiling & lock-free sync', youtubeUrl: 'https://www.youtube.com/watch?v=cQP8WApzIQQ' },
        { id: 'docker', name: 'Docker & Multi-Stage', score: 82, category: 'Infra', currentMilestone: 'Distroless scratch images & buildx', nextMilestone: 'Rootless container security hardening', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'k8s', name: 'Kubernetes Orchestration', score: 62, category: '2026 Booming Tech', currentMilestone: 'Deployments, Services & ConfigMaps', nextMilestone: 'Custom Resource Definitions & HPA autoscaling', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'redis', name: 'Redis Cache & Locks', score: 68, category: 'Databases', currentMilestone: 'Key-value expiry & pub/sub events', nextMilestone: 'Redlock distributed locks & atomic pipelines', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'debug', name: 'Production Debugging', score: 60, category: 'Problem Solving', currentMilestone: 'Pprof CPU/Memory profiling', nextMilestone: 'Linux eBPF tracing & core dump inspection', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ]
    };`;

const newStackPresets = `    const STACK_PRESETS = {
      java: [
        { id: 'java', name: 'Java & Multithreading', score: 35, base_percentage: 35, category: 'Backend Language', currentMilestone: 'Collections, Streams, Multithreading & OOP', nextMilestone: 'JVM Memory Tuning & Low-latency locks', youtubeUrl: 'https://www.youtube.com/watch?v=grEKMHGYyns' },
        { id: 'spring', name: 'Spring Boot & Microservices', score: 35, base_percentage: 35, category: 'Architecture', currentMilestone: 'REST APIs, JPA Entities & Dependency Injection', nextMilestone: 'Distributed Sagas & Circuit Breakers', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
        { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 35, base_percentage: 35, category: 'Databases', currentMilestone: 'Complex SQL, Transactions & Foreign Keys', nextMilestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'docker', name: 'Docker & Containers', score: 35, base_percentage: 35, category: 'Cloud Infra', currentMilestone: 'Multi-stage builds & Distroless images', nextMilestone: 'Kubernetes Pod Deployment & Helm', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'debug', name: 'Production Debugging', score: 35, base_percentage: 35, category: 'Problem Solving', currentMilestone: 'Stack trace diagnosis & unit test mocks', nextMilestone: 'Heap dump analysis & connection leak profiling', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ],
      fullstack: [
        { id: 'react', name: 'React & Next.js', score: 35, base_percentage: 35, category: 'Frontend', currentMilestone: 'Hooks, Server Components & State Management', nextMilestone: 'Performance Profiling & Bundle Optimization', youtubeUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ' },
        { id: 'nodejs', name: 'Node.js & Express', score: 35, base_percentage: 35, category: 'Backend Runtime', currentMilestone: 'Event loop async patterns & middleware', nextMilestone: 'Cluster Worker threads & stream buffering', youtubeUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ' },
        { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 35, base_percentage: 35, category: 'Databases', currentMilestone: 'Complex SQL & Prisma Schema migrations', nextMilestone: 'Connection pooling & Index optimization', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'docker', name: 'Docker & CI/CD', score: 35, base_percentage: 35, category: 'Delivery', currentMilestone: 'Containerizing Node apps & GitHub Actions', nextMilestone: 'Canary releases & automated integration tests', youtubeUrl: 'https://www.youtube.com/watch?v=pTFZFxd4hOI' },
        { id: 'debug', name: 'Production Debugging', score: 35, base_percentage: 35, category: 'Problem Solving', currentMilestone: 'Browser DevTools & API network error handling', nextMilestone: 'Memory leak profiling & APM tracing', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ],
      python: [
        { id: 'python', name: 'Python Core & AsyncIO', score: 35, base_percentage: 35, category: 'Language', currentMilestone: 'Generators, Decorators & Multiprocessing', nextMilestone: 'C-Extension profiling & memory optimization', youtubeUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ' },
        { id: 'fastapi', name: 'FastAPI & Microservices', score: 35, base_percentage: 35, category: 'Backend Architecture', currentMilestone: 'Pydantic schemas & Async endpoints', nextMilestone: 'High-concurrency worker scaling', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
        { id: 'vector', name: 'Vector DBs (Chroma/Pinecone)', score: 35, base_percentage: 35, category: '2026 Booming Tech', currentMilestone: 'Embedding generation & semantic search', nextMilestone: 'Hybrid BM25 + Vector retrieval caching', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'postgres', name: 'PostgreSQL & pgvector', score: 35, base_percentage: 35, category: 'Databases', currentMilestone: 'SQL schemas & relational indices', nextMilestone: 'HNSW vector indexing & memory buffers', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'debug', name: 'Production Debugging', score: 35, base_percentage: 35, category: 'Problem Solving', currentMilestone: 'Logging & unit tests with pytest', nextMilestone: 'Pipeline latency profiling & memory leaks', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ],
      cloud: [
        { id: 'golang', name: 'Go (Golang) Systems', score: 35, base_percentage: 35, category: 'Language', currentMilestone: 'Goroutines, Channels & interfaces', nextMilestone: 'Race detector profiling & lock-free sync', youtubeUrl: 'https://www.youtube.com/watch?v=cQP8WApzIQQ' },
        { id: 'docker', name: 'Docker & Multi-Stage', score: 35, base_percentage: 35, category: 'Infra', currentMilestone: 'Distroless scratch images & buildx', nextMilestone: 'Rootless container security hardening', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'k8s', name: 'Kubernetes Orchestration', score: 35, base_percentage: 35, category: '2026 Booming Tech', currentMilestone: 'Deployments, Services & ConfigMaps', nextMilestone: 'Custom Resource Definitions & HPA autoscaling', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'redis', name: 'Redis Cache & Locks', score: 35, base_percentage: 35, category: 'Databases', currentMilestone: 'Key-value expiry & pub/sub events', nextMilestone: 'Redlock distributed locks & atomic pipelines', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'debug', name: 'Production Debugging', score: 35, base_percentage: 35, category: 'Problem Solving', currentMilestone: 'Pprof CPU/Memory profiling', nextMilestone: 'Linux eBPF tracing & core dump inspection', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ]
    };`;

const norm2 = indexHtml.replace(/\r\n/g, '\n');
const normOldStack = oldStackPresets.replace(/\r\n/g, '\n');
if (norm2.includes(normOldStack)) {
  indexHtml = norm2.replace(normOldStack, newStackPresets).replace(/\n/g, '\r\n');
  console.log('✓ Sanitized STACK_PRESETS to default score 35');
}

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('✓ Successfully saved index.html updates!');
