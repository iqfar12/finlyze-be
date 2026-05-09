# CLAUDE.md — Fundness Backend Project Context
> Memory dokumen untuk Claude Code dan sesi baru.
> Letakkan di root repo (sejajar `README.md`) agar Claude Code auto-load.
> Update bagian §17 "Status terkini" setiap sprint.
> Last updated: May 2026

---

## 1. Apa itu Fundness

**Fundness** adalah platform AI Financial Advisor untuk pasar Indonesia.
Bukan lender, bukan broker — murni **advisor** (positioning ini kritis untuk regulasi OJK).

**Tagline:** *"Penasihat finansial berkelas institusional di kantong setiap UMKM, investor, dan keluarga Indonesia — dengan harga SaaS."*

> ⚠️ Hindari kata "hedge fund" dalam copy produk. Gunakan: *"institutional-grade"*, *"CFO digital"*, atau *"financial intelligence kelas profesional"*.

**Asal nama:**
- **Fund** — dari financial engineering / hedge fund strategy
- **Oneness** — dari Kamen Rider Geats form Oneness (ikatan + harapan = yang lemah menjadi kuat)
- **Fondness** — bunyi mirip "fondness" (kepedulian) → positioning advisor yang genuinely peduli klien

---

## 2. Produk & Sequencing

### Segmen (urutan eksekusi — JANGAN diparalelkan di Year 1)

| Fase | Segmen | Timeline | Status |
|------|--------|----------|--------|
| Year 1 | UMKM (10–200 karyawan) | Now | 🟡 Aktif dibangun |
| Year 1.5 | Individu (freelancer, personal finance) | Q4 2026 | 🔵 Planned |
| Year 2+ | Investor (IDX due diligence) | 2027+ | ⚪ Deferred |

### Pricing UMKM (Year 1)

| Tier | Harga | Target |
|------|-------|--------|
| Starter | IDR 499K/bulan | Freelancer, micro-business |
| Growth | IDR 1.49M/bulan | UMKM 10–50 karyawan |
| Enterprise | IDR 2.99M/bulan | Growing company, startup |

### 5 Core Capabilities (semua dalam scope Year 1)

1. **Financial Analysis** — analisa kondisi keuangan dari Excel atau PDF mutasi bank
2. **Strategy Engine** — strategi ekspansi atau exit berdasarkan kondisi keuangan aktual
3. **Report Generator** — ringkasan laporan siap-investor, siap-bank, siap-pajak
4. **Financial Tutor** — diskusi dan edukasi pengetahuan finansial (Bahasa Indonesia & English)
5. **Resource Optimizer** — maksimalkan aset beku, potensi investasi dari hutang, PO berjalan

---

## 3. Arsitektur Teknis Target

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 01 — CLIENT                                               │
│  React SPA  •  AI Advisor Chat (SSE)  •  Upload Portal          │
│  REST API consumers  •  Accountant API (B2B OAuth2 · Jurnal)    │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────────┐
│  LAYER 02 — API GATEWAY (NestJS Modular Monolith)               │
│  Fastify adapter  •  Passport JWT  •  Swagger/OpenAPI           │
│  @nestjs/swagger → Orval → TanStack Query hooks (frontend)      │
│                                                                  │
│  Middleware: AuthGuard · RateLimitGuard · TenantContext          │
│             AuditInterceptor · ValidationPipe · OJK Disclaimer  │
│                                                                  │
│  Modules:                                                        │
│  AuthModule    UploadModule    ParserModule    AnalysisModule    │
│  AdvisorModule ReportModule    QueueModule     ComplianceModule  │
│  StatementModule  ScopeModule  IDXMarketDataModule               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│  LAYER 03 — AGENT ORCHESTRATION                                 │
│  Fundness Agent — LangChain.js + LangGraph state machine        │
│  ReAct reasoning  •  tool-use with strict validators            │
│                                                                  │
│  Tools (Input):   ParseStatementTool · ClassifyTransactionsTool │
│  Tools (Retrieve): RagRetrieverTool · OjkRegLookupTool          │
│  Tools (Reason):   DCFValuationTool · LoanReadinessTool         │
│                    HealthScoreTool                               │
│  Tools (Output):   GenerateReportTool · DraftBahasaLetterTool   │
│                    EmitAlertTool                                 │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
┌──────────▼───────────┐   ┌──────────────────▼──────────────────┐
│  LAYER 04A — RAG     │   │  LAYER 04B — LLM PROVIDERS          │
│  pgvector (Y1)       │   │  ModelRouter (LangChain interface)   │
│  Hybrid BM25 + dense │   │                                      │
│  Cohere rerank       │   │  ● Claude (Anthropic) — PRIMARY      │
│  OJK · UU Pajak      │   │    Long-context reasoning            │
│  IDX filings         │   │    P&L synthesis · advisor chat      │
│  BI regulations      │   │                                      │
│  800-tok chunks      │   │  ● Groq — Fallback #1               │
│  Voyage-3 multilingual│  │    Ultra-low latency                 │
│  1024-dim vectors    │   │    Classification · short tasks      │
│  Cache: Redis        │   │                                      │
│                      │   │  ● Gemini (Google) — Fallback #2    │
└──────────────────────┘   │    Cost hedge · multimodal · OCR    │
                           │                                      │
                           │  ● Fundness Agent (Y2–Y3)           │
                           │    Fine-tuned vLLM · zero API cost   │
                           └─────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 05 — PERSISTENCE, OBSERVABILITY & COMPLIANCE            │
│                                                                  │
│  PostgreSQL   pgvector (RAG corpus)   Redis                     │
│  S3 Jakarta (ephemeral raw files → auto-delete after parse)     │
│  BullMQ queues                                                   │
│                                                                  │
│  LangSmith · OpenTelemetry · Grafana · Sentry                   │
│  OJK IKD Sandbox: advisory-info only · audit log 7yr           │
│  AES-256 at rest · TLS 1.3 · SOC2 Type I target Y2             │
│                                                                  │
│  Deploy: AWS ap-southeast-3 (Jakarta) · ECS Fargate             │
│  CI: GitHub Actions · Terraform · blue/green                    │
└─────────────────────────────────────────────────────────────────┘
```

### Tech stack ringkas

| Layer | Tech |
|-------|------|
| Frontend | React SPA, Fraunces + Geist fonts |
| Backend | NestJS + Fastify, TypeScript strict, Prisma ORM |
| Agent | LangChain.js, LangGraph |
| LLM | Claude (primary), Groq fallback #1, Gemini fallback #2 |
| RAG | pgvector + BM25 hybrid, Cohere rerank, Voyage-3 embeddings |
| Queue | BullMQ + Redis |
| Storage | PostgreSQL, S3 (Jakarta), Redis |
| Deploy | AWS ap-southeast-3, ECS Fargate, Terraform |
| Observability | LangSmith, OpenTelemetry, Grafana |
| Frontend API | `@nestjs/swagger` → Orval → TanStack Query hooks |

---

## 4. NestJS Module Map

```
src/
├── auth/           AuthModule        JWT + 2FA, multi-tenant SME orgs
├── upload/         UploadModule      Multer, ClamAV scan, S3 ephemeral
├── parser/         ParserModule      BCA/Mandiri parsers, pdf-parse, xlsx, OCR fallback
├── analysis/       AnalysisModule    P&L, Cashflow, DCF, health score engine
├── advisor/        AdvisorModule     LangChain bridge, Chat, SSE stream
├── report/         ReportModule      Loan-ready PDF pack, puppeteer + templating
├── queue/          QueueModule       BullMQ + Redis, async pipelines
├── compliance/     ComplianceModule  OJK IKD logging, disclaimer injector, E&O audit trail
├── statement/      StatementModule   StatementGroup + Statement CRUD, version management
├── scope/          ScopeModule       AnalysisScope CRUD, multi-period aggregation
│
├── market-data/    IDXMarketDataModule  ← dari idx-pipeline (wire pending)
│   ├── idx-market-data.module.ts
│   ├── idx-market-data.service.ts   (wrap IDXPipeline)
│   ├── idx-market-data.controller.ts
│   └── dto/
│       ├── ohlcv-query.dto.ts
│       ├── quote-response.dto.ts
│       └── metrics-response.dto.ts
│
└── common/         Guards, Interceptors, Pipes, Decorators
```

**Middleware chain (urutan):**
`AuthGuard (JWT + API Key)` → `RateLimitGuard` → `TenantContext` → `AuditInterceptor` → `ValidationPipe` → `EncryptionInterceptor (AES-256)` → `OJK Disclaimer Injector` → `Confidence Scorer`

**Catatan Prisma ↔ Swagger:**
Prisma tidak generate Swagger-compatible DTOs secara native. Gunakan:
- **Manual DTOs** dengan `@ApiProperty` — recommended untuk codebase kecil
- **`prisma-generator-nestjs-dto`** — auto-generate jika schema sudah stabil

Orval konsumsi OpenAPI spec di `/api-json` → generate typed client + TanStack Query hooks.

---

## 5. Database Schema (Prisma v2)

**File:** `prisma/schema.prisma`
**Provider:** PostgreSQL (Neon atau Supabase)
**Migration:** `npx prisma migrate dev --name <name>`

### Model hierarchy

```
Tenant (1) ──< User
Tenant (1) ──< StatementGroup (1) ──< Statement (versions) ──< Transaction
                                              │
                                              └──< AnalysisScopeStatement >──┐
                                                                              │
Tenant (1) ──< AnalysisScope ─────────────< AnalysisScopeStatement        (join)
                    │
                    └──< Analysis ──< FinancialSummary
                                  ──< HealthScore
                                  ──< LoanReadinessReport
                    │
Tenant (1) ──< ChatSession ──< ChatMessage
                    │
                    ├── scopeId? → AnalysisScope
                    └── analysisId? → Analysis
```

### Tiga design decision utama

**1. StatementGroup** — logical slot untuk satu `bank × periodStart × periodEnd` per tenant.
Unique constraint: `@@unique([tenantId, bank, periodStart, periodEnd])`.
Semua re-upload periode yang sama masuk ke group yang sama.

**2. Statement versioning** — re-upload periode yang sama:
```
1. Cari Statement dengan isLatest=true di group ini
2. Set: isLatest=false, status=SUPERSEDED, supersededById=newStatementId
3. Insert Statement baru: version=N+1, isLatest=true, status=PENDING
4. Parse → insert Transaction rows ke statement baru
5. Old transactions TIDAK PERNAH dihapus (full audit trail)
6. Null-kan s3Key setelah parsing selesai (ephemeral)
```

**3. AnalysisScope** — memisahkan analisis dari satu statement tunggal.
`scopeType`: `SINGLE | MULTI_PERIOD | MULTI_BANK | AGGREGATE`
`AnalysisScopeStatement` (join table) — snapshot exact versi statement saat scope dibuat.
Re-upload tidak mengubah scope yang sudah ada.

**Analysis versioning** — re-run scope+type yang sama:
```
1. Set Analysis lama (isLatest=true) → isLatest=false
2. Insert Analysis baru: version=N+1, isLatest=true
3. Hitung trend delta vs versi lama → simpan di HealthScore.trend
```

### Transaction model — mapping dari JSON input

| Prisma field | JSON key | Catatan |
|---|---|---|
| `sourceId` | `id` | e.g. "TXN001" — untuk deduplication |
| `txnDate` | `tanggal` | `@db.Date` |
| `tipe` | `tipe` | enum `CR \| DB` (BUKAN CREDIT/DEBIT) |
| `keterangan` | `keterangan` | deskripsi mentah dari bank |
| `jumlah` | `jumlah` | selalu positif; arah dari field `tipe` |
| `saldoSetelah` | `saldo_setelah` | nullable — beberapa row null |
| `channel` | `channel` | "BI-FAST", "E-Banking", "ATM", dll. |
| `counterparty` | `counterparty` | nama pihak lawan transaksi |
| `kategori` | `kategori` | enum `TransactionKategori` (13 nilai) |

### Statement summary fields (dari JSON `ringkasan`)

Diisi setelah parsing, disimpan di `Statement`:
`saldoAwal`, `saldoAkhir`, `totalCr`, `totalDb`, `netCashflow` — semua `Decimal(18,2)`, nullable.

### FinancialSummary — multi-period fields

`periodStart`, `periodEnd`, `periodCount` — span keseluruhan scope.
`periodBreakdown: Json?` — array per bulan:
```json
[{ "period": "2026-01", "revenue": 0, "expenses": 0, "netIncome": 0, "netCashflow": 0 }]
```

### Semua enum

```
Plan:                STARTER | GROWTH | ENTERPRISE
TenantStatus:        ACTIVE | SUSPENDED | CHURNED
UserRole:            OWNER | ADMIN | MEMBER
BankCode:            BCA | MANDIRI | BRI | BNI
StatementStatus:     PENDING | PARSING | PARSED | SUPERSEDED | FAILED
TransactionTipe:     CR | DB
TransactionKategori: TRANSFER_MASUK | TRANSFER_KELUAR | F_AND_B | E_COMMERCE |
                     LANGGANAN_DIGITAL | KESEHATAN | TRANSPORTASI | E_WALLET_TOPUP |
                     CICILAN_PINJAMAN | ATM_TARIK_TUNAI | BIAYA_ADMIN |
                     SUPERMARKET_RETAIL | BELANJA_UMUM
AnalysisScopeType:   SINGLE | MULTI_PERIOD | MULTI_BANK | AGGREGATE
AnalysisType:        PNL | CASHFLOW | HEALTH_SCORE | LOAN_READINESS | BUSINESS_PLAN | VALUATION
AnalysisStatus:      PENDING | RUNNING | COMPLETED | FAILED
SessionStatus:       ACTIVE | ARCHIVED
MessageRole:         USER | ASSISTANT | SYSTEM
```

---

## 6. Core API Flows

### Flow A — Upload & Parse (single statement)

```
POST /statements/upload
  → UploadModule: Multer, ClamAV scan, simpan ke S3 (ephemeral)
  → StatementModule: find or create StatementGroup (tenantId + bank + period)
  → jika group punya isLatest statement: mark SUPERSEDED, version++
  → insert Statement baru (version N, isLatest=true, status=PENDING)
  → enqueue ParseJob (BullMQ)
  → return { statementId, groupId }

ParseJob worker:
  → ParserModule: extract transactions dari PDF/XLSX/CSV
  → bulk insert Transaction rows (linked ke statementId)
  → update Statement: status=PARSED, transactionCount, saldo/total fields
  → null-kan s3Key (ephemeral cleanup)
  → enqueue AnalysisJob (SINGLE scope, type=PNL)
```

### Flow B — Run Analysis (single atau multi-period)

```
POST /analysis/run
  body: { statementIds: string[], type: AnalysisType }

  → ScopeModule: create AnalysisScope (derive scopeType dari jumlah + banks)
  → insert AnalysisScopeStatement rows (link isLatest statements)
  → cari Analysis lama untuk scope+type ini (isLatest=true) → set isLatest=false
  → insert Analysis baru (version++, isLatest=true, status=PENDING)
  → enqueue AnalysisJob

AnalysisJob worker:
  → fetch semua transactions dari semua linked statement versions
  → jika MULTI_PERIOD: aggregate per period, build periodBreakdown array
  → call LLM via ModelRouter (Claude → Groq → Gemini fallback)
  → validate output (arithmetic invariants + confidence score)
  → simpan ke Analysis.result (JSONB)
  → insert FinancialSummary | HealthScore | LoanReadinessReport sesuai type
  → jika HealthScore + previous version ada: hitung trend delta → HealthScore.trend
  → set Analysis.status=COMPLETED, completedAt=now()
```

### Flow C — Reads (query state terkini)

```
GET /statements?bank=BCA&isLatest=true
  → semua active statement versions untuk tenant

GET /statements/:groupId/history
  → semua versions (isLatest + SUPERSEDED) ordered by version desc

GET /analysis?scopeType=MULTI_PERIOD&type=HEALTH_SCORE&isLatest=true
  → latest health score untuk semua multi-period scopes

GET /analysis/:scopeId/history
  → semua analysis versions untuk scope ini, ordered by version desc
```

---

## 7. JSON Input Format Reference

Format JSON dari parser output (atau direct upload):

```json
{
  "account": {
    "no_rekening": "7435126626",
    "nama": "Muhammad Iqfar Mutaqin",
    "bank": "BCA",
    "cabang": "KCP Pasar Kemis",
    "periode": "Maret 2026",
    "mata_uang": "IDR"
  },
  "ringkasan": {
    "saldo_awal": 54025.62,
    "saldo_akhir": 123505.62,
    "total_cr": 25376894.0,
    "total_db": 25307414.0,
    "net_cashflow": 69480.0,
    "jumlah_transaksi_cr": 36,
    "jumlah_transaksi_db": 90
  },
  "kategori_enum": ["transfer_masuk", "transfer_keluar", "..."],
  "transaksi": [
    {
      "id": "TXN001",
      "tanggal": "2026-03-01",
      "tipe": "CR",
      "keterangan": "BI-FAST CR - BIF TRANSFER DR 028 MUHAMMAD IQFAR MUT",
      "jumlah": 100000.0,
      "saldo_setelah": 154025.62,
      "channel": "BI-FAST",
      "counterparty": "Muhammad Iqfar Mut",
      "kategori": "transfer_masuk"
    }
  ]
}
```

Mapping:
- `account.bank` → `BankCode` enum
- `ringkasan.*` → `Statement` summary fields
- setiap `transaksi[]` → satu `Transaction` row
- `kategori` string → `TransactionKategori` enum (uppercase + underscore)

---

## 8. LLM Pipeline (sudah ada, TypeScript/Node.js)

```
src/
├── types.ts           # Shared types (provider-agnostic)
├── utils.ts           # Logger, retry, rate limiter, cost tracker
├── providers/
│   ├── claude.ts      # Primary (claude-sonnet-4-20250514)
│   ├── groq.ts        # Fallback #1 (llama-3.3-70b-versatile)
│   ├── gemini.ts      # Fallback #2 (gemini-1.5-pro, File API)
│   ├── deepseek.ts    # Optional low-cost
│   └── ollama.ts      # Local/offline
└── pipeline.ts        # Unified auto-fallback orchestrator (CLI support)
```

Pola fallback: `Claude → Groq → Gemini → DeepSeek/Ollama`

**Prinsip yang WAJIB dipertahankan:**
- Setiap output LLM lewat output validator (arithmetic invariants)
- Setiap output include confidence score
- Source attribution wajib (kutip baris transaksi spesifik)
- Retry dengan exponential backoff di semua external calls

---

## 9. IDX Market Data Pipeline (sudah ada, TypeScript/Node.js)

```
idx-pipeline/src/
├── types.ts              # OHLCVBar, RealtimeQuote, FundamentalsBundle
├── utils.ts              # Logger, retry, rate limiter, file cache, CSV writer
├── providers/
│   ├── yahoo.ts          # Primary: OHLCV + quote + fundamentals (yahoo-finance2 v3)
│   ├── stooq.ts          # Fallback: CSV endpoint, gratis, no API key
│   └── idx-xbrl.ts       # Stub: IDX XBRL parser (belum diimplementasi)
├── metrics/
│   ├── derived.ts        # ROE, ROA, P/E, P/B, CAGR, Growth YoY
│   └── banking.ts        # NIM, LDR, BOPO, CIR (banking-specific, PSAK)
├── pipeline.ts           # Orchestrator + auto-fallback + cache + export
└── cli.ts                # CLI: ohlcv | quote | fundamentals | metrics
```

```bash
npm run dev -- quote BBCA BMRI
npm run dev -- ohlcv BBCA --from 2025-01-01 --to 2026-04-30
npm run dev -- metrics BBCA
```

**Kebijakan data:**
- Yahoo Finance + Stooq — OK, digunakan
- Scraping HTML IDX langsung — **DILARANG** (IDX ToS + risiko IKD sandbox)
- Stockbit/RTI unofficial API — dihindari (fragile)

**TODO:** Wire sebagai `IDXMarketDataModule` NestJS, swap `FileCache` ke Redis

---

## 10. Alur End-to-End Laporan Keuangan

```
1. Upload BCA PDF     → UploadModule (ClamAV scan → S3 temp)
2. Parse & Classify   → ParserModule (BCA parser → classifier)
3. Agent Plans        → LangGraph routes, tools dipilih
4. RAG Retrieve       → OJK POJK + tax + bank template specs (~45s)
5. Reason (Claude)    → P&L, DSCR, fix-list with citations (~300ms)
6. Validate           → arithmetic invariants + confidence score
7. Render PDF         → ReportModule (puppeteer + sign → S3)
8. Ship + Learn       → signed URL + webhook → training data lake
```

### JSON Schema output LLM

**Inference schema:**
```json
{
  "company": { "name": "", "period": "" },
  "income_statement": { "revenue": 0, "net_income": 0 },
  "balance_sheet": { "total_assets": 0, "total_equity": 0 },
  "ratios": { "roe": 0, "roa": 0, "net_margin": 0 },
  "health_score": { "overall": 0, "liquidity": 0, "profitability": 0 },
  "recommendations": [],
  "confidence": 0.0
}
```

**JSONL fine-tuning format:**
```jsonl
{"input": "...", "output": "...", "metadata": {"quality": 0.9, "source": "..."}, "timestamp": ""}
```

---

## 11. Business Rules (enforce in code — non-negotiable)

1. **s3Key ephemeral** — null-kan segera setelah parsing selesai. Raw bank files tidak boleh persist.
2. **Jangan hapus statements atau transactions** — gunakan `SUPERSEDED` + `isLatest=false`.
3. **Jangan hapus analyses** — gunakan `isLatest=false` pada versi lama.
4. **AnalysisScopeStatement adalah snapshot** — saat scope dibuat, link ke `isLatest=true` statements. Scope yang sudah ada tidak pernah dimutasi ketika upload baru masuk.
5. **Semua output LLM lewat output validator** sebelum disimpan ke `Analysis.result`. Cek arithmetic invariants (revenue - expenses = net income, dll).
6. **Disclaimer OJK wajib** di semua output analisis:
   ```
   "Fundness memberikan informasi analitis dan tidak merupakan saran investasi.
   Beroperasi di bawah pengawasan sandbox OJK IKD.
   Konsultasikan dengan penasihat berlisensi WPPE/WMI sebelum membuat keputusan investasi."
   ```
7. **Fundness tidak pernah broker pinjaman** — tidak ada submission endpoint, tidak ada integrasi lender di Year 1.
8. **Multi-tenancy strict** — setiap query harus scope dengan `tenantId`. Tidak ada cross-tenant data leaks.
9. **`TransactionTipe` adalah CR/DB** — bukan CREDIT/DEBIT. Match source JSON persis.
10. **`jumlah` selalu positif** — arah ditentukan dari field `tipe`, bukan dari sign amount.

---

## 12. Konvensi Kode

### TypeScript
- Strict mode wajib (`"strict": true`)
- Pattern `types.ts` / `utils.ts` sebagai shared layer
- Setiap provider punya interface yang sama → mudah swap
- Retry dengan exponential backoff + jitter di semua external calls
- Rate limiter via `p-limit` + delay spacing

### NestJS
- Module-based, satu responsibility per module
- Guard inject via `@UseGuards` (bukan global default)
- DTO validation via `class-validator` + `class-transformer`
- `@ApiProperty()` wajib di semua DTO untuk Swagger/Orval compatibility
- Controllers return typed response DTOs — tidak pernah raw Prisma models
- Services throw `HttpException` dengan pesan yang meaningful
- Semua `findMany` query include `where: { tenantId }` — tidak ada pengecualian
- Gunakan `prisma.$transaction([...])` untuk multi-step writes
- LLM calls lewat `ModelRouterService` — tidak pernah call Anthropic SDK langsung di business logic

### Git / CI
- Feature branch → PR → review → merge ke main
- GitHub Actions: test + typecheck + lint di setiap PR
- Blue/green deploy via ECS Fargate

---

## 13. Regulatory & Compliance

### Status OJK

| Stage | Timing | Status |
|-------|--------|--------|
| Pre-launch research | Month 1–6 | Customer discovery, belum butuh license |
| IKD sandbox entry | Month 6–9 | Register OJK IKD — **target aktif** |
| Full license filing | Month 12–15 | Application submitted |
| Full OJK license | Month 24–30 | Operations expanded |
| WPPE/WMI (Investor tier) | Year 2+ | Via licensed partner dulu |

### Prinsip positioning kritis
- Fundness **mempersiapkan** laporan; UMKM yang submit sendiri ke bank
- **Tidak** broker, submit, atau menerima komisi dari lender manapun
- Financing-readiness advisor adalah **non-binding**

---

## 14. Design System

### Palet warna
```css
--sky-50:  #f4f9fe   --sky-500: #3b82c4
--sky-100: #e6f1fb   --sky-600: #2d6aa8
--sky-200: #bfdaf1   --sky-700: #22507f
--sky-300: #94c1e6   --sky-800: #1a3a5c
--sky-400: #5fa1d6   --sky-900: #0f2440

--ink:        #11253d   --paper:      #fbfdff
--ink-soft:   #3d546f   --paper-alt:  #f4f9fe
--ink-mute:   #7289a3   --line:       #e0ecf7
--accent:     #f5b544   --mint:       #5fbfa2
--coral:      #e57563   --line-strong: #c8dcee
```

### Typography
- Display/headings: **Fraunces** (serif, variable)
- Body: **Geist** (sans)
- Code: **Geist Mono**

Pola heading khas (italic sky-600, weight 300):
```html
<h1>Penasihat finansial <em>di kantong setiap</em> UMKM Indonesia.</h1>
```

### Mock data (gunakan ini agar konsisten di semua session)
- Perusahaan demo: **PT Maju Jaya**
- User demo: **Budi Anggara** (initials: BA)
- Revenue demo: **IDR 284M** (Oktober 2025)
- Bank: **BCA**, mutasi **847 transaksi**
- Greeting: **"Selamat pagi, Budi!"** (bukan "Hello" atau "Good morning")

---

## 15. GTM & Business Model Ringkas

### Channels aktif Year 1 (bukan bank partnership)
1. Accounting firm referrals (Jurnal, Accurate) — pilot 2–3 firm dulu
2. Build-in-public LinkedIn + X
3. Direct outreach ke SME di F&B, retail, manufacturing
4. Content marketing: SEO untuk "analisis mutasi rekening", "syarat pinjaman UKM"
5. SME associations: HIPMI, Kadin, APINDO

**Kenapa bank partnership bukan prioritas:** Fundness parse file yang di-upload user sendiri — tidak butuh API bank atau data-sharing agreement.

### Unit economics (base case)

| Tier | Loaded CAC | Avg ARR | LTV (3yr) | LTV:CAC |
|------|-----------|---------|-----------|---------|
| Starter | $30–60 | $380 | $600 | ~10:1 |
| Growth | $200–400 | $1,150 | $1,800 | ~6:1 |
| Enterprise | $1,500–3,000 | $2,300 | $3,500 | ~1.5:1 |

### Financial projections (base case)

| | Year 1 | Year 2 | Year 3 |
|--|--------|--------|--------|
| UMKM paying | 200 | 1,500 | 6,500 |
| Individual | — | 20,000 | 110,000 |
| ARR | $300K | $1.7M | $7M |
| Gross margin | 62% | 72% | 78% |
| EBITDA | –$600K | –$1.5M | +$1M |

---

## 16. Panduan untuk Claude dalam Project Ini

1. **Bahasa sapaan default di UI = Bahasa Indonesia** — "Selamat pagi, [nama]!" bukan "Good morning"
2. **Jangan assume backend sudah ada** kecuali disebutkan explicitly
3. **Jangan drift ke Investor tier** di Year 1 — fokus UMKM dulu
4. **Selalu type-safe** — TypeScript strict, DTO dengan `@ApiProperty`, tidak ada `any` kecuali terpaksa
5. **Pola multi-provider** — setiap external service (LLM, data) punya provider interface sama dengan auto-fallback
6. **Output validation non-negotiable** — semua output LLM harus lewat arithmetic invariant check
7. **Ephemeral raw files** — file upload dihapus segera setelah parsing; hanya structured data yang persist
8. **OJK positioning** — Fundness adalah advisor, TIDAK pernah broker/lender/intermediary
9. **Pola retry** — exponential backoff + jitter di semua external calls
10. **IDX data via Yahoo/Stooq** — jangan scrape HTML IDX langsung (ToS risk + IKD sandbox risk)

---

## 17. Dokumen & Aset Referensi

| File | Deskripsi |
|------|-----------|
| `prisma/schema.prisma` | Full database schema (source of truth) |
| `Fundness_Business_Model_1.pdf` | Business Model v2.0 lengkap (14 section) |
| `fundness_prototype.html` | Prototype UI single-file (landing, dashboard, upload, advisor) |
| `financial_templates.xlsx` | Template keuangan UMKM |
| `7435126626_MAR_2026_transactions.json` | Real BCA statement JSON (gunakan untuk test parser) |
| `20260313laporankeuangan...pdf` | BCA Feb 2026 OJK monthly publication (contoh NPL/CAR source) |
| `1000258234.png` | NestJS RAG Architecture diagram |
| `1000258235.png` | System Architecture full (5-layer) |

---

## 18. Open Items & Validation TODO

### Teknis (prioritas)
- [ ] **NestJS backend scaffold** — prioritas utama; mulai dari `StatementModule` + `ScopeModule`
- [ ] **BCA/Mandiri parser** — core Year 1 feature; input: `7435126626_MAR_2026_transactions.json`
- [ ] **IDXXbrlProvider real** — parse XLSX companion file IDX
- [ ] **OJK PDF parser** — untuk NPL/CAR dari laporan publikasi; input: BCA Feb 2026 PDF
- [ ] **Wire idx-pipeline ke NestJS** sebagai `IDXMarketDataModule`
- [ ] **Redis cache** — swap `FileCache` di idx-pipeline untuk production
- [ ] **LangGraph agent** — setelah NestJS scaffold selesai
- [ ] **Auth strategy** — Auth.js vs Clerk vs custom Passport JWT

### Business (perlu customer discovery)
- [ ] **WTP validation** — IDR 499K/bulan Starter dan IDR 1.49M/bulan Growth
- [ ] **Accounting firm referral economics** — struktur komisi; pilot 2–3 firm

### Regulatory
- [ ] **IKD sandbox registration** — target Month 6–9 dari launch
- [ ] **IDX ToS review** — validasi pattern ingestion sebelum production deploy

---

## 19. Status Terkini

*Update setiap akhir sprint*

| Komponen | Status | Notes |
|----------|--------|-------|
| Business Model v2.0 | ✅ Final | PDF tersedia di project |
| Prototype UI (HTML) | ✅ Done | Single-file, 4 views |
| LLM inference pipeline (TS) | ✅ Done | 12 file, multi-provider |
| IDX market data pipeline | ✅ Done | 16 file, type-check clean |
| Prisma schema v2 | ✅ Done | Multi-doc, versioning, aggregate scope |
| NestJS backend scaffold | 🔴 Not started | Prioritas berikutnya |
| BCA/Mandiri parser | 🔴 Not started | Core Year 1 feature |
| LangGraph agent | 🔴 Not started | Setelah NestJS scaffold |
| RAG corpus (OJK + pajak) | 🔴 Not started | Ingestion pipeline needed |
| React frontend | 🔴 Not started | Setelah API siap |
| OJK IKD registration | 🔴 Not started | Month 6–9 target |

---

*CLAUDE.md · Fundness v2.0 · May 2026 · Confidential — For development use only*