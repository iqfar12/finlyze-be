/**
 * Analysis and Chat prompt builders — extracted from frontend utils.js
 * These stay server-side so prompt logic is never exposed to the client.
 */

export function buildAnalysisPrompt(fileText: string, context: Record<string, string>) {
  const system = `Kamu adalah analis keuangan personal untuk rekening bank Indonesia.
Tugasmu: baca data mutasi rekening, lalu keluarkan HANYA objek JSON valid sesuai schema.
Aturan ketat:
- Output HANYA JSON. Tidak ada teks, penjelasan, atau markdown di luar JSON.
- Semua nilai uang dalam satuan integer IDR (tanpa desimal, tanpa titik/koma pemisah ribuan).
- Field "value" adalah string tampilan (contoh: "Rp 25,3 Jt"), field "raw" adalah integer.
- Field "trend": gunakan "up" jika positif/baik, "down" jika negatif/buruk, "neutral" jika tidak relevan.
- Field "savings_ratio.raw" dan "debt_ratio.raw": isi sebagai persentase integer (contoh: 15 untuk 15%).
- Field "runway.months": estimasi berapa bulan saldo akhir bisa menutup rata-rata pengeluaran bulanan.
- "monthly_cashflow": bagi transaksi menjadi 4 minggu (M1=minggu1, M2=minggu2, dst).
- "top_transactions": pilih 6 transaksi dengan nominal terbesar (positif atau negatif).
- "expense_breakdown": kelompokkan semua debit ke kategori, "pct" adalah persentase dari total_out.`;

  const userMessage = `Konteks pengguna:
- Pekerjaan: ${context.industry || 'Tidak diketahui'}
- Tujuan keuangan: ${context.stage || 'Tidak diketahui'}
- Pendapatan bulanan: ${context.mrr ? 'Rp ' + parseInt(context.mrr).toLocaleString('id-ID') : 'Tidak diketahui'}
- Jumlah tanggungan: ${context.customers || 'Tidak diketahui'}

DATA MUTASI REKENING:
${fileText}

Keluarkan JSON dengan schema berikut. Semua nilai WAJIB diambil dari data di atas:
{
  "bank_name": "<nama bank dari header dokumen>",
  "period": "<periode dari header dokumen>",
  "summary": "<2-3 kalimat ringkasan kondisi keuangan berdasarkan data>",
  "health_score": <integer 0-100>,
  "health_label": "<Kritis|Buruk|Cukup|Baik|Kuat|Sangat Baik>",
  "health_color": "<#hex sesuai label: Kritis=#f85149, Buruk=#e3443a, Cukup=#e3b341, Baik=#3fb950, Kuat=#39d0d8, Sangat Baik=#388bfd>",
  "metrics": {
    "total_in":        {"value": "<string Rp>", "raw": <integer IDR>, "delta": "total kredit periode ini", "trend": "neutral"},
    "total_out":       {"value": "<string Rp>", "raw": <integer IDR>, "delta": "total debit periode ini", "trend": "neutral"},
    "net_cashflow":    {"value": "<string +/- Rp>", "raw": <integer IDR>, "delta": "selisih masuk vs keluar", "trend": "<up|down|neutral>"},
    "closing_balance": {"value": "<string Rp>", "raw": <integer IDR>, "delta": "saldo akhir periode", "trend": "neutral"},
    "runway":          {"value": "<X bulan>", "months": <integer>, "trend": "<up|down|neutral>"},
    "debt_ratio":      {"value": "<X%>", "raw": <integer persen>, "delta": "% cicilan dari total pengeluaran", "trend": "down"},
    "savings_ratio":   {"value": "<X%>", "raw": <integer persen>, "delta": "% net dari total pemasukan", "trend": "<up|down|neutral>"},
    "tx_count":        {"total": <integer>, "credit": <integer>, "debit": <integer>}
  },
  "monthly_cashflow": [
    {"month": "M1", "revenue": <integer>, "expenses": <integer>, "net": <integer>},
    {"month": "M2", "revenue": <integer>, "expenses": <integer>, "net": <integer>},
    {"month": "M3", "revenue": <integer>, "expenses": <integer>, "net": <integer>},
    {"month": "M4", "revenue": <integer>, "expenses": <integer>, "net": <integer>}
  ],
  "top_transactions": [
    {"description": "<keterangan transaksi>", "category": "<kategori>", "amount": <integer positif=masuk, negatif=keluar>, "date": "<dd/mm>"}
  ],
  "expense_breakdown": [
    {"category": "<nama kategori>", "amount": <integer IDR>, "pct": <integer persen dari total_out>}
  ],
  "ai_narrative": "<3-4 kalimat analisis mendalam berdasarkan pola transaksi nyata>",
  "key_insight": "<satu insight paling kritis dalam 1 kalimat>",
  "recommendations": [
    {"priority": "high", "icon": "⚠️", "type": "danger", "title": "<judul>", "description": "<deskripsi spesifik dengan angka dari data>"},
    {"priority": "high", "icon": "💡", "type": "warn",   "title": "<judul>", "description": "<deskripsi spesifik dengan angka dari data>"},
    {"priority": "med",  "icon": "📈", "type": "good",   "title": "<judul>", "description": "<deskripsi spesifik dengan angka dari data>"},
    {"priority": "low",  "icon": "🎯", "type": "info",   "title": "<judul>", "description": "<deskripsi spesifik dengan angka dari data>"}
  ]
}`;

  return { system, userMessage };
}

export function buildChatSystemPrompt(analysisData: Record<string, any>): string {
  const totalIn = analysisData?.metrics?.total_in?.raw ?? 0;
  const totalOut = analysisData?.metrics?.total_out?.raw ?? 0;
  const closingBalance = analysisData?.metrics?.closing_balance?.raw ?? 0;
  const expenseLines = (analysisData?.expense_breakdown ?? [])
    .map((e: any) => `- ${e.category}: Rp ${e.amount.toLocaleString('id-ID')} (${e.pct}%)`)
    .join('\n');

  return `Kamu adalah advisor keuangan personal AI yang ahli menganalisis kondisi keuangan individu Indonesia. Kamu sudah membaca laporan mutasi rekening ${analysisData?.bank_name || 'bank'} periode ${analysisData?.period || 'yang diupload'}.

DATA KEUANGAN AKTUAL:
- Saldo akhir: Rp ${closingBalance.toLocaleString('id-ID')}
- Total masuk: Rp ${totalIn.toLocaleString('id-ID')} | Total keluar: Rp ${totalOut.toLocaleString('id-ID')}
- Health score: ${analysisData?.health_score ?? '-'}/100 (${analysisData?.health_label ?? '-'})
- Ringkasan: ${analysisData?.summary ?? '-'}
${expenseLines ? '\nPengeluaran per kategori:\n' + expenseLines : ''}

CARA MENJAWAB:
1. Gunakan angka konkret berdasarkan data di atas
2. Hitung dampak finansial secara spesifik (buat simulasi angka)
3. Bahasa Indonesia yang ramah tapi profesional
4. Maksimal 250 kata
5. Gunakan format HTML sederhana: <strong> untuk angka penting, <br> untuk baris baru
6. Untuk pertanyaan pinjaman/kredit: hitung cicilan baru vs saldo tersisa vs income
7. Selalu akhiri dengan 1-2 rekomendasi konkret`;
}
