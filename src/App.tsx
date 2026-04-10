import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import {
  Zap,
  Camera,
  ChevronRight,
  Search,
  FileText,
  Calendar,
  Tag,
  Coins,
  Receipt,
  Calculator,
  MapPin,
  BarChart,
  Lightbulb,
  Cpu,
  TrendingUp,
  Info,
  CheckCircle,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Share2,
  Download,
  History,
  ArrowUpDown
} from 'lucide-react';

interface SavedAnalysis extends AnalysisResult {
  id: string;
  savedAt: number;
}

interface AnalysisResult {
  consumoKwh: number;
  classificacao: string;
  badgeClass: string;
  bandeira: string;
  valorEstimado: string;
  tarifaUnit: number;
  icms: string;
  iluminacaoPublica: string;
  diasFatura: number;
  dica: string;
  cidade: string;
  distribuidora: string;
  mesReferencia: string;
  dataVencimento: string;
  valorTusd: string;
  valorTe: string;
  valorBandeira: string;
  pisCofins: string;
  multasJuros: string;
  historicoConsumo: { mes: string; consumoKwh: number }[];
  mediaUltimos3Meses: number;
  analiseComparativa: string;
  variacaoPercentual: number;
  projecaoProximoMes: number;
  custoDiario: number;
  anomaliasDetectadas: string[];
}

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | SavedAnalysis | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const detalhesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('@conta-pro:history');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        // Garante que itens antigos sem ID ganhem um ID único para não dar erro ao excluir
        const comIds = parsed.map((item: any, index: number) => ({
          ...item,
          id: item.id || `old-${Date.now()}-${index}`,
          savedAt: item.savedAt || Date.now() - index * 1000
        }));
        setHistory(comIds); 
      } catch (e) {}
    }
  }, []);

  const saveToHistory = (data: AnalysisResult) => {
    const newEntry: SavedAnalysis = { ...data, id: Date.now().toString(), savedAt: Date.now() };
    setHistory(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('@conta-pro:history', JSON.stringify(updated));
      return updated;
    });
  };

  const loadFromHistory = (item: SavedAnalysis) => {
    setResult(item);
    setImageSrc(null);
    setFileName('');
    setTimeout(() => {
      detalhesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('@conta-pro:history', JSON.stringify(updated));
      return updated;
    });
    if (result && (result as SavedAnalysis).id === id) {
      setResult(null);
    }
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('@conta-pro:history');
    if (result && 'id' in result) {
      setResult(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setResult(null); // Reset results on new image
      };
      reader.readAsDataURL(file);
    } else {
      setImageSrc(null);
      setFileName('');
    }
  };

  const handleClear = () => {
    setImageSrc(null);
    setFileName('');
    setResult(null);
  };

  const handleExportPDF = async () => {
    if (!detalhesRef.current) return;
    
    try {
      const element = detalhesRef.current;
      
      // Salva o estilo original
      const originalStyle = element.style.cssText;
      
      // Ajusta o estilo temporariamente para o PDF (fundo branco, padding)
      element.style.backgroundColor = '#f8fafc';
      element.style.padding = '20px';
      element.style.borderRadius = '0px';
      
      const canvas = await html2canvas(element, {
        scale: 2, // Maior qualidade
        useCORS: true,
        backgroundColor: '#f8fafc',
      });
      
      // Restaura o estilo original
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Analise_Conta_${result?.mesReferencia?.replace('/', '_') || 'Luz'}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `📊 *Análise Completa da Conta de Luz (Pro)*

🏢 *Distribuidora:* ${result.distribuidora}
📍 *Local:* ${result.cidade}
📅 *Referência:* ${result.mesReferencia}
⏳ *Vencimento:* ${result.dataVencimento}

💰 *Valor Total:* R$ ${result.valorEstimado}
⚡ *Consumo Total:* ${result.consumoKwh} kWh
📊 *Classificação:* ${result.classificacao}
🚩 *Bandeira:* ${result.bandeira} (Adicional: R$ ${result.valorBandeira})

📈 *MÉTRICAS AVANÇADAS*
• Custo Diário: R$ ${result.custoDiario.toFixed(2)}
• Variação Mensal: ${result.variacaoPercentual > 0 ? '+' : ''}${result.variacaoPercentual}%
• Projeção Próximo Mês: ${result.projecaoProximoMes} kWh

🧾 *DETALHAMENTO*
• Tarifa de Energia (TE): R$ ${result.valorTe}
• Tarifa de Uso (TUSD): R$ ${result.valorTusd}
• ICMS Estimado: R$ ${result.icms}
• PIS/COFINS: R$ ${result.pisCofins}
• Iluminação Pública: R$ ${result.iluminacaoPublica}
• Multas/Juros: R$ ${result.multasJuros}

💡 *RESUMO DA ANÁLISE*
${result.analiseComparativa}

${result.anomaliasDetectadas.length > 0 ? `🚨 *ANOMALIAS DETECTADAS*\n${result.anomaliasDetectadas.map(a => `• ${a}`).join('\n')}\n` : ''}
Gerado por Analisador de Conta Pro.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Minha Análise de Conta de Luz',
          text: text,
        });
      } catch (err) {
        console.log('Erro ao compartilhar', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Resumo completo copiado para a área de transferência!');
    }
  };

  const getIncentiveMessage = (variacao: number) => {
    if (variacao < -10) return "🎉 Excelente! Você reduziu bastante seu consumo. Continue assim!";
    if (variacao < 0) return "👏 Muito bem! Seu consumo diminuiu em relação ao mês passado.";
    if (variacao === 0) return "⚖️ Seu consumo se manteve estável.";
    if (variacao <= 10) return "⚠️ Atenção: Seu consumo subiu um pouco. Fique de olho!";
    return "🚨 Alerta: Aumento significativo no consumo! Revise seus hábitos.";
  };

  const analisarComGemini = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
    // Use import.meta.env for Vite production builds, fallback to process.env for AI Studio
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "AIzaSyDummyKeyForTesting";
    
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const prompt = `Você é um sistema avançado de auditoria de faturas de energia elétrica brasileiras de nível PREMIUM/PRO. 
Analise esta imagem e extraia o MÁXIMO de detalhes técnicos e financeiros.
Identifique a composição da tarifa (TUSD e TE), impostos (ICMS, PIS, COFINS), adicionais de bandeira e dados de faturamento.
MUITO IMPORTANTE: Localize o quadro de "Histórico de Consumo" na conta. Extraia os dados dos 3 meses imediatamente anteriores ao mês atual faturado.
Calcule a média de consumo (kWh) desses 3 meses.
Crie uma 'analiseComparativa' detalhada dizendo o que melhorou e o que piorou em relação a essa média.
Além disso, gere métricas avançadas:
- variacaoPercentual: variação % do mês atual em relação ao mês anterior (negativo se caiu).
- projecaoProximoMes: estimativa de consumo para o próximo mês baseado na tendência.
- custoDiario: valor total dividido pelos dias faturados.
- anomaliasDetectadas: liste possíveis anomalias (ex: "Aumento súbito de 30% no consumo", "Bandeira vermelha acionada", etc). Se não houver, liste "Nenhuma anomalia grave detectada".
Baseie-se APENAS em dados reais e exatos extraídos da fatura. Não faça suposições ou estimativas sobre os aparelhos da casa.
Retorne ESTRITAMENTE no formato JSON solicitado.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Image } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            consumoKwh: { type: Type.NUMBER, description: "Consumo faturado em kWh" },
            valorTotal: { type: Type.NUMBER, description: "Valor total da fatura em Reais" },
            mesReferencia: { type: Type.STRING, description: "Mês e ano de referência (ex: Abr/2026)" },
            dataVencimento: { type: Type.STRING, description: "Data de vencimento (ex: 15/04/2026)" },
            bandeira: { type: Type.STRING, description: "Bandeira tarifária vigente (Verde, Amarela, Vermelha 1, Vermelha 2)" },
            valorBandeira: { type: Type.NUMBER, description: "Valor cobrado a mais devido à bandeira tarifária" },
            diasFatura: { type: Type.NUMBER, description: "Quantidade de dias faturados" },
            tarifaMedia: { type: Type.NUMBER, description: "Tarifa média (Valor Total / Consumo)" },
            valorTusd: { type: Type.NUMBER, description: "Valor total da TUSD (Tarifa de Uso do Sistema de Distribuição)" },
            valorTe: { type: Type.NUMBER, description: "Valor total da TE (Tarifa de Energia)" },
            icms: { type: Type.NUMBER, description: "Valor do ICMS em Reais" },
            pisCofins: { type: Type.NUMBER, description: "Valor somado de PIS e COFINS em Reais" },
            iluminacaoPublica: { type: Type.NUMBER, description: "Valor da Contribuição de Iluminação Pública (CIP/COSIP) em Reais" },
            multasJuros: { type: Type.NUMBER, description: "Valor de multas, juros ou encargos por atraso" },
            cidade: { type: Type.STRING, description: "Cidade e Estado da instalação" },
            distribuidora: { type: Type.STRING, description: "Nome da distribuidora (ex: Enel, Light, Cemig, Copel)" },
            isContaDeLuz: { type: Type.BOOLEAN, description: "Verdadeiro se a imagem for ou contiver partes de uma conta de luz brasileira (seja flexível, mesmo fotos parciais devem retornar true)" },
            historicoConsumo: { 
              type: Type.ARRAY, 
              description: "Histórico de consumo dos últimos 3 meses anteriores ao atual",
              items: {
                type: Type.OBJECT,
                properties: {
                  mes: { type: Type.STRING, description: "Mês/Ano (ex: Mar/26)" },
                  consumoKwh: { type: Type.NUMBER, description: "Consumo em kWh" }
                }
              }
            },
            mediaUltimos3Meses: { type: Type.NUMBER, description: "Média de consumo dos últimos 3 meses em kWh" },
            analiseComparativa: { type: Type.STRING, description: "Análise comparando o consumo atual com a média dos últimos 3 meses. Diga o que melhorou e o que piorou." },
            variacaoPercentual: { type: Type.NUMBER, description: "Variação percentual em relação ao mês anterior" },
            projecaoProximoMes: { type: Type.NUMBER, description: "Projeção de consumo para o próximo mês em kWh" },
            custoDiario: { type: Type.NUMBER, description: "Custo médio diário em Reais" },
            anomaliasDetectadas: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de anomalias ou alertas detectados" 
            }
          },
          required: ["consumoKwh", "valorTotal", "isContaDeLuz"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    // Se a IA disser que não é conta de luz, mas conseguiu extrair consumo ou valor, nós permitimos continuar.
    if (data.isContaDeLuz === false && !data.consumoKwh && !data.valorTotal) {
      throw new Error("A imagem não parece ser uma conta de luz válida ou os dados estão muito ilegíveis. Tente tirar uma foto mais próxima e nítida.");
    }

    const consumoKwh = data.consumoKwh || 0;
    
    let classificacao = '';
    let badgeClass = '';
    if (consumoKwh <= 150) {
      classificacao = 'Baixo';
      badgeClass = 'bg-lime-100 text-lime-700 border border-lime-200';
    } else if (consumoKwh <= 400) {
      classificacao = 'Médio';
      badgeClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    } else {
      classificacao = 'Alto';
      badgeClass = 'bg-red-100 text-red-700 border border-red-200';
    }

    let dica = '';
    if (classificacao === 'Baixo') {
      dica = 'Seu consumo está excelente! Continue com os bons hábitos de economia de energia.';
    } else if (classificacao === 'Médio') {
      dica = 'Consumo dentro da média. Fique atento a equipamentos que ficam muito tempo ligados, como geladeira e ar-condicionado.';
    } else {
      dica = 'Atenção: Consumo elevado. Verifique se há fuga de energia ou equipamentos antigos consumindo muito.';
    }

    return {
      consumoKwh: consumoKwh,
      classificacao,
      badgeClass,
      bandeira: data.bandeira || 'N/D',
      valorEstimado: (data.valorTotal || 0).toFixed(2),
      tarifaUnit: data.tarifaMedia || 0,
      icms: (data.icms || 0).toFixed(2),
      iluminacaoPublica: (data.iluminacaoPublica || 0).toFixed(2),
      diasFatura: data.diasFatura || 30,
      dica,
      cidade: data.cidade || 'N/D',
      distribuidora: data.distribuidora || 'N/D',
      mesReferencia: data.mesReferencia || 'N/D',
      dataVencimento: data.dataVencimento || 'N/D',
      valorTusd: (data.valorTusd || 0).toFixed(2),
      valorTe: (data.valorTe || 0).toFixed(2),
      valorBandeira: (data.valorBandeira || 0).toFixed(2),
      pisCofins: (data.pisCofins || 0).toFixed(2),
      multasJuros: (data.multasJuros || 0).toFixed(2),
      historicoConsumo: data.historicoConsumo || [],
      mediaUltimos3Meses: data.mediaUltimos3Meses || 0,
      analiseComparativa: data.analiseComparativa || 'Não foi possível gerar a análise comparativa com os dados extraídos.',
      variacaoPercentual: data.variacaoPercentual || 0,
      projecaoProximoMes: data.projecaoProximoMes || 0,
      custoDiario: data.custoDiario || 0,
      anomaliasDetectadas: data.anomaliasDetectadas || [],
    };
  };

  const handleAnalyze = async () => {
    if (!imageSrc) {
      alert('📸 Por favor, selecione uma foto da conta de luz primeiro.');
      return;
    }

    setIsAnalyzing(true);

    try {
      const [mimeTypePart, base64Data] = imageSrc.split(';base64,');
      const mimeType = mimeTypePart.replace('data:', '');
      
      const dados = await analisarComGemini(base64Data, mimeType);
      setResult(dados);
      saveToHistory(dados);
      setTimeout(() => {
        detalhesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (erro: any) {
      console.error(erro);
      alert(erro.message || 'Ocorreu um erro na análise. Tente novamente com uma imagem mais nítida.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getBandeiraFormatada = (bandeira: string) => {
    if (bandeira.includes('Vermelha')) return '🔴 Vermelha 2';
    if (bandeira === 'Amarela') return '🟡 Amarela';
    return '🟢 Verde';
  };

  const parseMesReferencia = (mesRef: string) => {
    if (!mesRef || mesRef === 'N/D') return 0;
    const parts = mesRef.split('/');
    if (parts.length !== 2) return 0;
    
    const mesStr = parts[0].toLowerCase().trim().substring(0, 3);
    const anoStr = parts[1].trim();
    
    const meses: Record<string, number> = {
      'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
      'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
    };
    
    const mesNum = meses[mesStr] || 0;
    let anoNum = parseInt(anoStr, 10) || 0;
    
    if (anoNum === 0 || mesNum === 0) return 0;
    
    // Converte anos com 2 dígitos para 4 dígitos (ex: 26 -> 2026)
    if (anoNum < 100) anoNum += 2000;
    
    // Retorna no formato YYYYMM para facilitar a ordenação numérica (ex: 202604)
    return anoNum * 100 + mesNum;
  };

  const sortedHistory = [...history].sort((a, b) => {
    const valA = parseMesReferencia(a.mesReferencia);
    const valB = parseMesReferencia(b.mesReferencia);
    
    // Se o mês for igual ou inválido, usa a data em que foi salvo como desempate
    if (valA === valB) {
      const timeA = a.savedAt || 0;
      const timeB = b.savedAt || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    }
    
    return sortOrder === 'desc' ? valB - valA : valA - valB;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-lime-500 text-white shadow-sm">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-slate-800 leading-tight">Analisador de Conta</h1>
                <span className="bg-slate-800 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/30 shadow-sm">Pro</span>
              </div>
              <p className="text-xs text-slate-500">Auditoria Premium</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Criado por</span>
            <div className="font-semibold text-slate-700">Carlos Seabra</div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 print:hidden">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Camera size={18} className="text-lime-500" />
                Enviar Fatura
              </h2>
              
              <div className="mb-6 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-lime-400 to-yellow-400 rounded-2xl blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
                <label htmlFor="imageInput" className="relative w-full bg-white hover:bg-slate-50 border border-lime-100 py-6 rounded-2xl text-sm font-medium cursor-pointer transition-all flex flex-col items-center justify-center gap-3">
                  <div className="bg-gradient-to-br from-lime-400 to-yellow-400 p-3.5 rounded-full shadow-[0_0_20px_rgba(163,230,53,0.4)] group-hover:scale-110 transition-transform duration-300">
                    <ImageIcon size={26} className="text-white" />
                  </div>
                  <span className="font-bold bg-gradient-to-r from-lime-600 to-yellow-500 bg-clip-text text-transparent tracking-wide text-lg">Buscar na galeria</span>
                </label>
              </div>
              <input type="file" id="imageInput" accept="image/*" className="hidden" onChange={handleFileChange} />

              {imageSrc ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-6 aspect-[3/4] relative group">
                  <img src={imageSrc} alt="Documento" className="w-full h-full object-contain" />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="animate-spin text-lime-500" size={32} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 mb-6 aspect-[3/4] flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                  <FileText size={40} className="mb-4 text-slate-300" />
                  <p className="font-medium text-slate-600 mb-1">Nenhuma imagem</p>
                  <p className="text-sm text-slate-400">Clique no botão acima para buscar uma conta na sua galeria.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !imageSrc}
                  className="flex-1 bg-lime-500 text-white py-3.5 rounded-xl font-semibold text-sm transition-all hover:bg-lime-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      Analisar Conta
                    </>
                  )}
                </button>
                
                {imageSrc && (
                  <button
                    onClick={handleClear}
                    disabled={isAnalyzing}
                    className="px-4 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 py-3.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center shadow-sm"
                    title="Limpar e enviar outra"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print:hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <History size={18} className="text-lime-500" />
                    Histórico Salvo
                  </h2>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="text-xs font-medium text-slate-400 hover:text-lime-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-lime-50"
                      title="Ordenar histórico"
                    >
                      <ArrowUpDown size={14} />
                      {sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}
                    </button>
                    <button 
                      onClick={clearAllHistory}
                      className="text-xs font-medium text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                      title="Limpar todo o histórico"
                    >
                      <Trash2 size={14} />
                      Limpar tudo
                    </button>
                  </div>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedHistory.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => loadFromHistory(item)} 
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between group hover:-translate-y-0.5 hover:shadow-md ${result && (result as SavedAnalysis).id === item.id ? 'border-lime-500 bg-lime-50 shadow-sm ring-1 ring-lime-500/20' : 'border-slate-200 bg-white hover:border-lime-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${result && (result as SavedAnalysis).id === item.id ? 'bg-lime-100 text-lime-600' : 'bg-slate-50 text-slate-400 group-hover:bg-lime-50 group-hover:text-lime-500'} transition-colors`}>
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                            {item.mesReferencia !== 'N/D' ? item.mesReferencia : 'Fatura sem data'}
                          </div>
                          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">R$ {item.valorEstimado}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">{item.consumoKwh} kWh</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => deleteFromHistory(item.id, e)} 
                        className="text-slate-300 hover:text-white hover:bg-red-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Excluir do histórico"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Analytics Dashboard */}
          <div className="lg:col-span-8 print:col-span-12 print:w-full">
            {result ? (
              <div ref={detalhesRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                
                {/* Actions Bar */}
                <div className="flex justify-end gap-3 print:hidden" data-html2canvas-ignore="true">
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Share2 size={16} />
                    Compartilhar
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Download size={16} />
                    Exportar PDF
                  </button>
                </div>

                {/* Top KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1">Consumo Total</div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-4xl font-bold text-slate-800">{result.consumoKwh}</span>
                      <span className="text-slate-500 font-medium">kWh</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-sm text-slate-500">Classificação</span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${result.badgeClass}`}>
                        {result.classificacao}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1">Valor Faturado</div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-xl font-semibold text-slate-400">R$</span>
                      <span className="text-4xl font-bold text-slate-800">{result.valorEstimado}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-sm text-slate-500">Vencimento</span>
                      <span className="text-sm font-medium text-slate-700">{result.dataVencimento}</span>
                    </div>
                  </div>
                </div>

                {/* Advanced Metrics (PRO) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 mb-1">Custo Diário</div>
                    <div className="text-2xl font-bold text-slate-800">R$ {result.custoDiario.toFixed(2)}</div>
                    <div className="text-xs text-slate-400 mt-1">Média por dia faturado</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 mb-1">Variação Mensal</div>
                    <div className={`text-2xl font-bold ${result.variacaoPercentual > 0 ? 'text-red-500' : 'text-lime-600'}`}>
                      {result.variacaoPercentual > 0 ? '+' : ''}{result.variacaoPercentual}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">vs. mês anterior</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 mb-1">Projeção Próximo Mês</div>
                    <div className="text-2xl font-bold text-slate-800">{result.projecaoProximoMes} <span className="text-sm font-medium text-slate-500">kWh</span></div>
                    <div className="text-xs text-slate-400 mt-1">Estimativa baseada no histórico</div>
                  </div>
                </div>

                {/* Histórico e Comparação */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-lime-500" />
                    Análise Histórica e Padrões
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Gráfico */}
                    <div>
                      <div className="h-48 w-full mb-4">
                        {result.historicoConsumo && result.historicoConsumo.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={[...result.historicoConsumo].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="consumoKwh" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="consumoKwh" position="top" formatter={(value: any) => `${value} kWh`} style={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} />
                                {[...result.historicoConsumo].reverse().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.consumoKwh > result.mediaUltimos3Meses ? '#f87171' : '#84cc16'} />
                                ))}
                              </Bar>
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-sm text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                            Dados históricos insuficientes
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className="text-sm font-medium text-slate-600">Média do Período</span>
                        <span className="text-base font-bold text-slate-800">{result.mediaUltimos3Meses} <span className="text-xs font-normal text-slate-500">kWh</span></span>
                      </div>
                    </div>

                    {/* Análise Comparativa e Anomalias */}
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Info size={14} />
                          Resumo da Análise
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {result.analiseComparativa}
                        </p>
                      </div>

                      {result.anomaliasDetectadas && result.anomaliasDetectadas.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <CheckCircle size={14} />
                            Detecção de Anomalias
                          </h4>
                          <ul className="space-y-2">
                            {result.anomaliasDetectadas.map((anomalia, idx) => (
                              <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-amber-500 mt-0.5">•</span>
                                {anomalia}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed Data Grid */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <BarChart size={18} className="text-lime-500" />
                      Detalhamento da Fatura
                    </h3>
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">Ref: {result.mesReferencia}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Col 1: Composição */}
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Composição da Tarifa</div>
                      <div className="space-y-1">
                        <DataRow label="Tarifa de Energia (TE)" value={`R$ ${result.valorTe}`} />
                        <DataRow label="Tarifa de Uso (TUSD)" value={`R$ ${result.valorTusd}`} />
                        <DataRow label="Bandeira Tarifária" value={result.bandeira} valueColor={result.bandeira !== 'Verde' && result.bandeira !== 'N/D' ? 'text-yellow-600 font-medium' : 'text-lime-600 font-medium'} />
                        <DataRow label="Adicional Bandeira" value={`R$ ${result.valorBandeira}`} />
                        <DataRow label="Tarifa Média / kWh" value={`R$ ${result.tarifaUnit.toFixed(2)}`} />
                      </div>
                    </div>

                    {/* Col 2: Impostos e Outros */}
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Impostos e Encargos</div>
                      <div className="space-y-1">
                        <DataRow label="ICMS Estimado" value={`R$ ${result.icms}`} />
                        <DataRow label="PIS/COFINS" value={`R$ ${result.pisCofins}`} />
                        <DataRow label="Iluminação Pública (CIP)" value={`R$ ${result.iluminacaoPublica}`} />
                        <DataRow label="Multas e Juros" value={`R$ ${result.multasJuros}`} valueColor={parseFloat(result.multasJuros) > 0 ? 'text-red-500 font-medium' : 'text-slate-700'} />
                        <DataRow label="Período de Apuração" value={`${result.diasFatura} dias`} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                      <MapPin size={18} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{result.distribuidora}</div>
                      <div className="text-xs text-slate-500">{result.cidade}</div>
                    </div>
                  </div>
                </div>

                {/* AI Insight & Incentive */}
                <div className="space-y-4">
                  <div className="bg-lime-50 border border-lime-100 rounded-2xl p-5 flex gap-4 items-start">
                    <div className="mt-0.5 text-lime-600 bg-white p-2 rounded-full shadow-sm">
                      <Lightbulb size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-lime-800 mb-1">Dica de Economia</h4>
                      <p className="text-sm text-lime-900 leading-relaxed">
                        {result.dica}
                      </p>
                    </div>
                  </div>

                  <div className={`border rounded-2xl p-5 flex gap-4 items-center justify-center text-center ${result.variacaoPercentual <= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                    <p className="text-sm font-medium">
                      {getIncentiveMessage(result.variacaoPercentual)}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Pronto para analisar</h3>
                <p className="max-w-sm text-sm text-slate-500 leading-relaxed">
                  Envie a foto da sua conta de luz. O sistema vai extrair todos os detalhes, impostos e comparar seu histórico de consumo.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper component for data rows
function DataRow({ label, value, valueColor = 'text-slate-700' }: { label: string, value: string | number, valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}
