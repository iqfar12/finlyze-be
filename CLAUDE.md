# CLAUDE.md — Fundness Backend Project Context

> File ini adalah memory dokumen untuk Claude Code dan sesi baru.
> Letakkan di root repo (sejajar `README.md`) agar Claude Code auto-load.
> Update bagian "Status terkini" dan "Open items" setiap sprint.

---

## 1. Apa itu Fundness

**Fundness** adalah platform AI Financial Advisor untuk pasar Indonesia.  
Bukan lender, bukan broker — murni **advisor** (positioning ini kritis untuk regulasi OJK).

**Tagline (untuk dipakai konsisten):**  
*"Penasihat finansial berkelas institusional di kantong setiap UMKM, investor, dan keluarga Indonesia — dengan harga SaaS."*

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
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│  LAYER 03 — AGENT ORCHESTRATION                                 │
│  Fundness Agent — LangChain.js + LangGraph state machine        │
│  ReAct reasoning  •  tool-use with strict validators            │
│  Prompt library versioned in code                               │
│                                                                  │
│  Tools (Input):  ParseStatementTool · ClassifyTransactionsTool  │
│  Tools (Retrieve): RagRetrieverTool · OjkRegLookupTool          │
│  Tools (Reason):   DCFValuationTool · LoanReadinessTool         │
│                    HealthScoreTool                               │
│  Tools (Output):   GenerateReportTool · DraftBahasaLetterTool   │
│                    EmitAlertTool                                 │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
┌──────────▼───────────┐   ┌──────────────────▼──────────────────┐
│  LAYER 04A — RAG     │   │  LAYER 04B — LLM PROVIDERS          │
│  pgvector (IDX Y1)   │   │  ModelRouter (LangChain interface)   │
│  Hybrid BM25 + dense │   │                                      │
│  Cohere rerank       │   │  ● Claude (Anthropic) — PRIMARY      │
│  OJK · UU Pajak      │   │    Long-context reasoning            │
│  IDX filings         │   │    P&L synthesis · advisor chat      │
│  BI regulations      │   │                                      │
│                      │   │  ● Groq — Fallback #1               │
│  Ingestion: nightly  │   │    Ultra-low latency                 │
│  Retrieval: per query│   │    Classification · short tasks      │
│  Cache: Redis        │   │                                      │
│                      │   │  ● Gemini (Google) — Fallback #2    │
│  800-tok chunks      │   │    Cost hedge · multimodal          │
│  Voyage-3 multilingual│  │    OCR bridge                       │
│  1024-dim vectors    │   │                                      │
│                      │   │  ● Fundness Agent (Y2–Y3)           │
└──────────────────────┘   │    Fine-tuned vLLM · zero API cost  │
                           └─────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 05 — PERSISTENCE, OBSERVABILITY & COMPLIANCE            │
│                                                                  │
│  PostgreSQL   pgvector (RAG corpus 20GB Y1)   Redis             │
│  S3 Jakarta   BullMQ queues   (Ephemeral raw files → delete)    │
│                                                                  │
│  LangSmith (chain traces)  •  OpenTelemetry + Grafana           │
│  OJK IKD Sandbox: advisory-info only · audit log 7yr           │
│  AES-256 at rest  •  TLS 1.3  •  SOC2 Type I target Y2         │
│                                                                  │
│  Deploy: AWS ap-southeast-3 (Jakarta) • ECS Fargate             │
│  CI: GitHub Actions • Terraform • blue/green                    │
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

## 4. Multi-Provider LLM Pipeline (sudah ada)

Pipeline inference multi-provider dengan auto-fallback sudah dibangun dalam **TypeScript/Node.js** (12 file):

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

**Pola fallback:** Claude → Groq → Gemini → (DeepSeek/Ollama sebagai last resort)

**Prinsip desain yang WAJIB dipertahankan:**
- Setiap output LLM melewati output validator (arithmetic invariants)
- Setiap output harus include confidence score
- Source attribution wajib (kutip baris transaksi spesifik, bukan klaim generik)
- Ephemeral raw files: upload → parse → **langsung hapus**

---

## 5. IDX Market Data Pipeline (baru selesai)

Pipeline ingestion data pasar IDX dengan multi-source auto-fallback, dibangun TypeScript/Node.js (16 file):

```
idx-pipeline/
├── src/
│   ├── types.ts              # OHLCVBar, RealtimeQuote, FundamentalsBundle, dll
│   ├── utils.ts              # Logger, retry, rate limiter, file cache, CSV writer
│   ├── providers/
│   │   ├── yahoo.ts          # Primary: OHLCV + quote + fundamentals (yahoo-finance2 v3)
│   │   ├── stooq.ts          # Fallback OHLCV: CSV endpoint, gratis, no API key
│   │   └── idx-xbrl.ts       # Stub: IDX XBRL / XLSX parser (belum diimplementasi)
│   ├── metrics/
│   │   ├── derived.ts        # ROE, ROA, P/E, P/B, CAGR, Growth YoY
│   │   └── banking.ts        # NIM, LDR, BOPO, CIR (banking-specific, PSAK conventions)
│   ├── pipeline.ts           # Orchestrator + auto-fallback + cache + export
│   ├── cli.ts                # CLI: ohlcv | quote | fundamentals | metrics
│   └── examples/
│       ├── banks-batch.ts    # Batch Big-4 banks (BBCA/BMRI/BBRI/BBNI)
│       └── synthetic-test.ts # Test tanpa network (pakai angka BCA Feb 2026)
├── package.json
└── tsconfig.json
```

### Cara pakai

```bash
cd idx-pipeline && npm install

npm run dev -- quote BBCA BMRI           # Real-time quote
npm run dev -- ohlcv BBCA --from 2025-01-01 --to 2026-04-30   # OHLCV historis
npm run dev -- metrics BBCA              # NIM, LDR, ROE, P/E, dll
npx tsx src/examples/banks-batch.ts     # Batch Big-4 sekaligus
```

### Metrik banking — mana bisa, mana tidak bisa dihitung otomatis

| Metrik | Status | Catatan |
|--------|--------|---------|
| NIM (approx) | ✅ Computed | Proxy: avg total assets sebagai earning assets |
| LDR | ✅ Computed | Butuh `loansReceivable` + `customerDeposits` di balance sheet |
| BOPO | ✅ Computed | OpEx / OpIncome — metric regulator Indonesia |
| CIR | ✅ Computed | (NetInterestIncome + Fee) / OpEx |
| ROE, ROA | ✅ Computed | Standard |
| **NPL** | ⚠️ Disclosure-only | Dari Laporan Kualitas Aset Produktif OJK |
| **CAR** | ⚠️ Disclosure-only | Tier-1 capital / RWA — dari Basel III disclosure |

**TODO berikutnya untuk pipeline ini:**
- [ ] Implementasi `IDXXbrlProvider` real (parse XLSX companion IDX)
- [ ] OJK PDF parser untuk NPL/CAR (file BCA Feb 2026 sudah ada di project)
- [ ] Wire sebagai NestJS `IDXMarketDataModule` (lihat Section 8)
- [ ] Swap `FileCache` ke Redis untuk production

---

## 6. Sumber Data & Kebijakan Scraping

### Prinsip yang sudah diputuskan

**Yang boleh / digunakan:**
- Yahoo Finance (`yahoo-finance2` v3) — OHLCV, quote, fundamentals IDX. Suffix `.JK` untuk IDX.
- Stooq CSV endpoint — OHLCV fallback, gratis, no API key, no rate limit
- IDX XBRL/XLSX companion files — untuk laporan keuangan resmi (implementasi pending)
- OJK monthly PDF publications — untuk NPL/CAR banking (BCA Feb 2026 contohnya sudah ada)
- Jurnal/Accurate API — integrasi accounting (Year 2+)

**Yang TIDAK dilakukan / dihindari:**
- Scraping halaman HTML IDX secara langsung — **IDX ToS melarang automated access**; risiko regulatori kritis mengingat Fundness sedang ngurus IKD sandbox
- Stockbit / RTI Business unofficial API — fragile, bisa break tanpa warning
- Bank app API langsung — by design Fundness tidak butuh ini (user upload sendiri)

### Arsip referensi BCA Feb 2026

File `20260313laporankeuanganpublikasibulananfebruari2026ind.pdf` di project ini adalah contoh laporan keuangan publikasi bulanan OJK (BCA, Februari 2026). Angka-angka kunci:

- Total Aset: IDR 1,563,219,350 juta
- Total Liabilitas: IDR 1,283,750,246 juta
- Total Ekuitas: IDR 279,469,104 juta
- Kredit yang Diberikan: IDR 953,224,015 juta
- Giro + Tabungan + Deposito: IDR 1,227,768,191 juta
- Net Interest Income (2 bulan YTD): IDR 12,857,104 juta
- Net Income (2 bulan YTD): IDR 9,228,168 juta

Format ini cocok dijadikan input untuk OJK PDF parser yang akan mengisi `disclosed.npl` dan `disclosed.car` di pipeline.

---

## 7. Design System (untuk konsistensi UI)

### Palet warna

```css
--sky-50:  #f4f9fe   --sky-500: #3b82c4
--sky-100: #e6f1fb   --sky-600: #2d6aa8
--sky-200: #bfdaf1   --sky-700: #22507f
--sky-300: #94c1e6   --sky-800: #1a3a5c
--sky-400: #5fa1d6   --sky-900: #0f2440

--ink:       #11253d   /* teks utama */
--ink-soft:  #3d546f   /* teks sekunder */
--ink-mute:  #7289a3   /* placeholder, label */
--paper:     #fbfdff   /* background utama */
--paper-alt: #f4f9fe   /* background card */
--line:      #e0ecf7   /* border */
--line-strong: #c8dcee

--accent:    #f5b544   /* amber — sparingly */
--mint:      #5fbfa2   /* positive signal */
--coral:     #e57563   /* alert/negative */
```

### Typography

- Display / headings: **Fraunces** (serif, variabel weight + italic)
- Body: **Geist** (sans-serif)
- Code / monospace: **Geist Mono**

**Pola heading khas Fundness** (italic di sky-600, weight 300):
```html
<h1>A hedge fund advisor <em>in every</em> Indonesian founder's pocket.</h1>
```

### Mock data (gunakan ini agar konsisten)

- Perusahaan demo: **PT Maju Jaya**
- User demo: **Budi Anggara** (initials: BA)
- Revenue demo: **IDR 284M** (Oktober 2025)
- Bank demo: **BCA**, mutasi 847 transaksi
- Greeting: **"Selamat pagi, Budi!"** (bukan "Hello")

---

## 8. NestJS Module Map

Sesuai system architecture diagram (LAYER 02):

```
src/
├── auth/           AuthModule       JWT 2FA, multi-tenant SME orgs
├── upload/         UploadModule     Multer, ClamAV scan, S3 ephemeral
├── parser/         ParserModule     BCA/Mandiri parsers, pdf-parse, xlsx, OCR
├── analysis/       AnalysisModule   P&L, Cashflow, DCF, health score engine
├── advisor/        AdvisorModule    LangChain bridge, Chat, SSE stream
├── report/         ReportModule     Loan-ready PDF pack, puppeteer, templating
├── queue/          QueueModule      BullMQ, Redis, async pipelines
├── compliance/     ComplianceModule OJK IKD logging, disclaimer injector
│
├── market-data/    IDXMarketDataModule  ← BARU (dari idx-pipeline)
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

### Catatan Prisma ↔ NestJS Swagger

Prisma tidak menghasilkan Swagger-compatible DTOs secara native. Pilihan:
1. **Manual DTOs** dengan `@ApiProperty` — recommended untuk codebase kecil
2. **`prisma-generator-nestjs-dto`** — auto-generate, cocok jika schema Prisma sudah stabil

Untuk Orval: setelah DTOs di-annotate, NestJS auto-generate OpenAPI spec di `/api-json`. Orval konsumsi spec itu untuk menghasilkan typed client + TanStack Query hooks.

---

## 9. Regulatory & Compliance

### Status OJK

| Stage | Timing | Status |
|-------|--------|--------|
| Pre-launch research | Month 1–6 | Customer discovery, no license needed |
| IKD sandbox entry | Month 6–9 | Register OJK IKD — **target aktif** |
| Full license filing | Month 12–15 | Application submitted |
| Full OJK license | Month 24–30 | Operations expanded |
| WPPE/WMI (Investor tier) | Year 2+ | Via licensed partner dulu |

### Disclaimer wajib (tampil di semua output)

```
"Fundness memberikan informasi analitis dan tidak merupakan saran investasi. 
Beroperasi di bawah pengawasan sandbox OJK IKD. 
Konsultasikan dengan penasihat berlisensi WPPE/WMI sebelum membuat keputusan investasi."
```

### Prinsip positioning kritis

- Fundness **mempersiapkan** laporan; UMKM yang submit sendiri ke bank
- **Tidak** broker, submit, atau menerima komisi dari lender manapun
- Financing-readiness advisor adalah **non-binding** — memberi skor likelihood, bukan jaminan approval

---

## 10. Financial Pipeline untuk Laporan Keuangan

### Alur end-to-end "Generate my loan-ready report"

```
1. Upload BCA PDF          → UploadModule (ClamAV scan → S3 temp)
2. Parse & Classify        → ParserModule (BCA parser → fine-tuned classifier)
3. Agent Plans             → LangGraph routes, tools dipilih
4. RAG Retrieve            → OJK POJK + tax + bank template specs (~45s)
5. Reason (Claude)         → P&L, DSCR, fix-list with citations (~300ms)
6. Validate                → arithmetic invariants + confidence score
7. Render PDF              → ReportModule (puppeteer + sign → S3)
8. Ship + Learn            → signed URL + webhook → training data lake
```

### JSON Schema untuk output LLM

Dua skema terpisah (dari diskusi pipeline sebelumnya):

**Inference schema** — untuk analisis real-time:
```json
{
  "company": { "name": "", "period": "" },
  "income_statement": { "revenue": 0, "net_income": 0, "... ": "..." },
  "balance_sheet": { "total_assets": 0, "total_equity": 0 },
  "ratios": { "roe": 0, "roa": 0, "net_margin": 0 },
  "health_score": { "overall": 0, "liquidity": 0, "profitability": 0 },
  "recommendations": [],
  "confidence": 0.0
}
```

**JSONL fine-tuning format** — untuk dataset training:
```jsonl
{"input": "...", "output": "...", "metadata": {"quality": 0.9, "source": "..."}, "timestamp": ""}
```

---

## 11. Konvensi Kode

### TypeScript

- Strict mode wajib (`"strict": true`)
- Pattern `types.ts` / `utils.ts` sebagai shared layer (lihat idx-pipeline)
- Setiap provider punya interface yang sama → mudah swap
- Retry dengan exponential backoff di semua external calls
- Rate limiter via `p-limit` + delay spacing

### NestJS

- Module-based, satu responsibility per module
- Guard inject via `@UseGuards` (bukan global default untuk flexibility)
- DTO validation via `class-validator` + `class-transformer`
- `@ApiProperty()` wajib di semua DTO untuk Swagger compatibility

### Git / CI

- Feature branch → PR → review → merge to main
- GitHub Actions: test + typecheck + lint di setiap PR
- Blue/green deploy via ECS Fargate

---

## 12. Business Model Ringkas

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

### Competitive moat

1. **Data moat** — labeled Indonesian financial dataset yang compound (2GB Y1 → 300GB Y3)
2. **Regulatory moat** — OJK IKD sandbox → full license (18–30 bulan; barrier untuk newcomer)
3. **Parser moat** — BCA/Mandiri Y1, BRI/BNI Y2; proprietary, works on user-uploaded files

---

## 13. GTM & Channels

### Primary channels (bukan bank partnership)

**Kenapa bank partnership bukan prioritas:**  
Fundness parse file yang di-upload user sendiri. Tidak butuh API bank, tidak butuh data-sharing agreement. Bank deal mungkin berguna sebagai co-marketing di Year 2+ tapi bukan jalur kritis — dan bukan risiko di Year 1.

**Channels aktif Year 1:**
1. Accounting firm referrals (Jurnal, Accurate) — pilot 2–3 firm dulu
2. Build-in-public LinkedIn + X (community fintech)
3. Direct outreach ke SME di F&B, retail, manufacturing
4. Content marketing: SEO untuk "analisis mutasi rekening", "syarat pinjaman UKM"
5. SME associations: HIPMI, Kadin, APINDO

### Loan-readiness sebagai wedge

Messaging Year 1 yang paling convert:
- *"Dapatkan laporan keuangan siap-bank dalam 1 klik"*
- *"Tahu apakah bank akan approve pinjaman Anda — sebelum Anda apply"*

---

## 14. Dokumen & Aset Referensi

| File | Deskripsi |
|------|-----------|
| `Fundness_Business_Model_1.pdf` | Business Model v2.0 lengkap (14 section) |
| `fundness_prototype.html` | Prototype UI single-file (landing, dashboard, upload, advisor) |
| `financial_templates.xlsx` | Template keuangan UMKM |
| `20260313laporankeuangan...pdf` | BCA Feb 2026 monthly OJK publication (contoh sumber NPL/CAR) |
| `1000257013.png` / `1000257014.png` | Business Model Canvas v1.0 |
| `1000258234.png` | NestJS RAG Architecture diagram |
| `1000258235.png` | System Architecture full (5-layer) |
| `idx-pipeline/` | Market data ingestion pipeline (lihat Section 5) |

---

## 15. Open Items & Validation TODO

### Teknis (prioritas)

- [ ] **IDXXbrlProvider real** — parse XLSX companion file IDX untuk laporan keuangan resmi
- [ ] **OJK PDF parser** — untuk NPL/CAR dari laporan publikasi bulanan; input: BCA Feb 2026 PDF
- [ ] **Wire idx-pipeline ke NestJS** sebagai `IDXMarketDataModule` (lihat Section 8)
- [ ] **Redis cache** — swap `FileCache` di idx-pipeline untuk production
- [ ] **LangChain tool wrapper** — `IdxMarketDataTool` agar Fundness Agent bisa call market data
- [ ] **Prisma schema** — desain schema untuk multi-tenant (tenants, users, reports, analyses)
- [ ] **Auth strategy** — tentukan: Auth.js vs Clerk vs custom Passport JWT

### Business (perlu customer discovery)

- [ ] **WTP validation** — apakah UMKM mau bayar IDR 499K/bulan (Starter) dan IDR 1.49M/bulan (Growth)?
- [ ] **Accounting firm referral economics** — struktur komisi; pilot 2–3 firm sebelum scale
- [ ] **Investor tier pricing** — defer sampai OJK license lebih clear (Year 2+)

### Regulatory

- [ ] **IKD sandbox registration** — target Month 6–9 dari launch
- [ ] **IDX ToS review** — validasi pattern ingestion data sebelum production deploy

---

## 16. Panduan untuk Claude dalam Project Ini

Ketika bekerja di codebase ini, pegang prinsip berikut:

1. **Bahasa sapaan default di UI = Bahasa Indonesia** — "Selamat pagi, [nama]!" bukan "Good morning"
2. **Jangan assume backend sudah ada** kecuali disebutkan explicitly — Year 1 masih dalam development
3. **Jangan drift ke Investor tier** di Year 1 — fokus UMKM dulu
4. **Selalu type-safe** — TypeScript strict, DTO dengan @ApiProperty, tidak ada `any` kecuali terpaksa
5. **Pola multi-provider** — setiap external service (LLM, data) punya provider interface yang sama dengan auto-fallback
6. **Output validation non-negotiable** — semua output LLM harus lewat arithmetic invariant check
7. **Ephemeral raw files** — file upload harus dihapus segera setelah parsing, hanya structured data yang persist
8. **OJK positioning** — Fundness adalah advisor, TIDAK pernah broker/lender/intermediary
9. **Pola retry** — exponential backoff + jitter di semua external calls, bukan fire-and-forget
10. **IDX data via Yahoo/Stooq** — jangan scrape HTML IDX langsung (ToS risk + IKD sandbox risk)

---

## 17. Status Terkini

*Update ini setiap akhir sprint*

| Komponen | Status | Notes |
|----------|--------|-------|
| Business Model v2.0 | ✅ Final | PDF tersedia |
| Prototype UI (HTML) | ✅ Done | Single-file, 4 views |
| LLM inference pipeline (TS) | ✅ Done | 12 file, multi-provider |
| IDX market data pipeline | ✅ Done | 16 file, type-check clean |
| NestJS backend scaffold | 🔴 Not started | Prioritas selanjutnya |
| BCA/Mandiri parser | 🔴 Not started | Core Year 1 feature |
| LangGraph agent | 🔴 Not started | Setelah NestJS scaffold |
| RAG corpus (OJK + pajak) | 🔴 Not started | Ingestion pipeline needed |
| React frontend | 🔴 Not started | Setelah API siap |
| OJK IKD registration | 🔴 Not started | Month 6–9 target |

---

*CLAUDE.md · Fundness Backend v2.0 · Terakhir diupdate: Mei 2026*  
*Confidential — For development use only*