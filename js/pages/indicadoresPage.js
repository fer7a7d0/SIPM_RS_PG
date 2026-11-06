import "../router.js";
import { ROUTES } from "../config.js";
import { apiRequest } from "../services/apiClient.js";
import { getSession } from "../services/authService.js";
import { formatDateEs } from "../utils/dateTime.js";

const supervisorName = document.getElementById("supervisorName");
const currentDate = document.getElementById("currentDate");
const indicatorsTitle = document.getElementById("indicatorsTitle");
const monthFilter = document.getElementById("monthFilter");
const indicadoresMessage = document.getElementById("indicadoresMessage");
const kpiDayFinalizadas = document.getElementById("kpiDayFinalizadas");
const kpiWeekFinalizadas = document.getElementById("kpiWeekFinalizadas");
const kpiMonthFinalizadas = document.getElementById("kpiMonthFinalizadas");
const kpiDayHallazgos = document.getElementById("kpiDayHallazgos");
const kpiWeekHallazgos = document.getElementById("kpiWeekHallazgos");
const kpiMonthHallazgos = document.getElementById("kpiMonthHallazgos");
const supervisorTableBody = document.querySelector("#supervisorTable tbody");
const operatorTableBody = document.querySelector("#operatorTable tbody");
const trendChart = document.getElementById("trendChart");
const trendChartEmpty = document.getElementById("trendChartEmpty");
const trendChartSummary = document.getElementById("trendChartSummary");
const areaTableBody = document.querySelector("#areaTable tbody");
const operatorRankingTableBody = document.querySelector("#operatorRankingTable tbody");
const findingTypeRankingTableBody = document.querySelector("#findingTypeRankingTable tbody");
const findingRankingTableBody = document.querySelector("#findingRankingTable tbody");
const operatorFindingParetoSummary = document.getElementById("operatorFindingParetoSummary");
const operatorFindingParetoTableBody = document.querySelector("#operatorFindingParetoTable tbody");
const timeGlobal = document.getElementById("timeGlobal");
const timeBySupervisorTableBody = document.querySelector("#timeBySupervisorTable tbody");
let latestRequestId = 0;

init();

async function init() {
  const session = getSession();
  if (!session) {
    window.location.replace(ROUTES.login);
    return;
  }

  supervisorName.textContent = session.userName || session.userId || "-";
  currentDate.textContent = `Fecha: ${formatDateEs(Date.now())}`;
  const currentMonth = getCurrentMonthValue();
  monthFilter.value = currentMonth;
  monthFilter.max = currentMonth;
  monthFilter.addEventListener("change", () => loadSummary(session, monthFilter.value));

  await loadSummary(session, currentMonth);
}

async function loadSummary(session, selectedMonth) {
  const monthToLoad = selectedMonth || getCurrentMonthValue();
  monthFilter.value = monthToLoad;

  const requestId = ++latestRequestId;
  setMessage("Cargando indicadores...", "info");
  try {
    const summary = await apiRequest("dashboard.kpiSummary", {
      token: session.token,
      month: monthToLoad
    });

    if (requestId !== latestRequestId) {
      return;
    }

    renderSummary(summary || {}, monthToLoad);
    setMessage("", "");
  } catch (error) {
    if (requestId === latestRequestId) {
      setMessage(error.message || "No se pudo cargar la informacion.", "error");
    }
  }
}

function renderSummary(summary, selectedMonth) {
  const monthLabel = formatMonthLabel(summary.selectedMonth || selectedMonth);
  const showCurrentPeriods = Boolean(summary.isCurrentMonth);
  indicatorsTitle.textContent = `Indicadores: ${monthLabel}`;
  document.getElementById("trendTitle").textContent = `Tendencia de hallazgos (${monthLabel})`;

  [
    "daySupervisionsCard",
    "weekSupervisionsCard",
    "dayFindingsCard",
    "weekFindingsCard",
    "supervisorDayHeader",
    "supervisorWeekHeader"
  ].forEach((id) => {
    document.getElementById(id).classList.toggle("d-none", !showCurrentPeriods);
  });
  document.getElementById("kpiFinalizadasCards").classList.toggle("single-period", !showCurrentPeriods);
  document.getElementById("kpiHallazgosCards").classList.toggle("single-period", !showCurrentPeriods);

  const periods = summary.periods || {};
  const day = periods.day || {};
  const week = periods.week || {};
  const month = periods.month || {};

  kpiDayFinalizadas.textContent = String(day.supervisionesFinalizadas ?? "-");
  kpiWeekFinalizadas.textContent = String(week.supervisionesFinalizadas ?? "-");
  kpiMonthFinalizadas.textContent = String(month.supervisionesFinalizadas ?? "-");
  kpiDayHallazgos.textContent = String(day.hallazgosTotales ?? "-");
  kpiWeekHallazgos.textContent = String(week.hallazgosTotales ?? "-");
  kpiMonthHallazgos.textContent = String(month.hallazgosTotales ?? "-");

  renderSupervisorTable(summary.bySupervisor || [], showCurrentPeriods);
  renderOperatorTable(summary.byOperator || []);
  renderTrendTable(summary.findingsTrend || [], monthLabel);
  renderAreaTable(summary.areaRanking || []);
  renderOperatorRankingTable(summary.byOperator || []);
  renderFindingTypeRankingTable(summary.findingTypeRanking || []);
  renderFindingRankingTable(summary.findingRanking || []);
  renderOperatorFindingPareto(summary.operatorFindingPareto || {});
  renderTimeMetrics(summary.timeMetrics || {});
}

function renderFindingRankingTable(rows) {
  findingRankingTableBody.innerHTML = "";

  if (!rows.length) {
    findingRankingTableBody.innerHTML = '<tr><td colspan="2" class="text-muted">Sin datos</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.finding || "Hallazgo sin detalle"}</td>
      <td>${row.hallazgos ?? "-"}</td>
    `;
    findingRankingTableBody.appendChild(tr);
  });
}

function renderOperatorFindingPareto(data) {
  const operators = data.operators || [];
  const totalHallazgos = Number(data.totalHallazgos || 0);
  const coveredHallazgos = Number(data.coveredHallazgos || 0);
  const coveredPct = Number(data.coveredPct || 0);
  const paretoOperatorCount = Number(data.paretoOperatorCount ?? operators.length);

  operatorFindingParetoTableBody.innerHTML = "";
  if (!operators.length) {
    operatorFindingParetoSummary.textContent = "Sin hallazgos para el periodo seleccionado.";
    operatorFindingParetoTableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Sin datos</td></tr>';
    return;
  }

  operatorFindingParetoSummary.textContent =
    `${coveredHallazgos} de ${totalHallazgos} hallazgos (${coveredPct}%) concentrados en ${paretoOperatorCount} operadores.`;

  const sortedOperators = [...operators].sort((a, b) => {
    const findingDifference = Number(b.hallazgosTotales || 0) - Number(a.hallazgosTotales || 0);
    if (findingDifference !== 0) {
      return findingDifference;
    }
    return String(a.operatorName || a.operatorId || "").localeCompare(
      String(b.operatorName || b.operatorId || "")
    );
  });

  sortedOperators.forEach((operator) => {
    const findings = operator.findings || [];
    findings.forEach((finding, index) => {
      const tr = document.createElement("tr");

      if (index === 0) {
        const operatorCell = document.createElement("td");
        operatorCell.textContent = operator.operatorName || operator.operatorId || "-";
        operatorCell.rowSpan = findings.length;
        tr.appendChild(operatorCell);

        const totalCell = document.createElement("td");
        totalCell.textContent = String(operator.hallazgosTotales ?? "-");
        totalCell.rowSpan = findings.length;
        tr.appendChild(totalCell);
      }

      const findingCell = document.createElement("td");
      findingCell.textContent = finding.finding || "Hallazgo sin detalle";
      tr.appendChild(findingCell);

      const countCell = document.createElement("td");
      countCell.textContent = String(finding.hallazgos ?? "-");
      tr.appendChild(countCell);
      operatorFindingParetoTableBody.appendChild(tr);
    });
  });
}

function renderFindingTypeRankingTable(rows) {
  findingTypeRankingTableBody.innerHTML = "";

  if (!rows.length) {
    findingTypeRankingTableBody.innerHTML = '<tr><td colspan="2" class="text-muted">Sin datos</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.category || "Sin categoria"}</td>
      <td>${row.hallazgos ?? "-"}</td>
    `;
    findingTypeRankingTableBody.appendChild(tr);
  });
}

function renderOperatorRankingTable(rows) {
  operatorRankingTableBody.innerHTML = "";

  if (!rows.length) {
    operatorRankingTableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Sin datos</td></tr>';
    return;
  }

  const sortedRows = [...rows].sort((a, b) => {
    const aRatio = a.supervisionesFinalizadas > 0 ? a.hallazgosTotales / a.supervisionesFinalizadas : -1;
    const bRatio = b.supervisionesFinalizadas > 0 ? b.hallazgosTotales / b.supervisionesFinalizadas : -1;
    return bRatio - aRatio
      || (b.hallazgosTotales - a.hallazgosTotales)
      || (b.supervisionesFinalizadas - a.supervisionesFinalizadas)
      || String(a.operatorName || a.operatorId || "").localeCompare(String(b.operatorName || b.operatorId || ""));
  });

  sortedRows.slice(0, 10).forEach((row) => {
    const tr = document.createElement("tr");
    const findingsPerSupervision = row.supervisionesFinalizadas > 0
      ? (row.hallazgosTotales / row.supervisionesFinalizadas).toFixed(2)
      : "-";
    tr.innerHTML = `
      <td>${row.operatorName || row.operatorId || "-"}</td>
      <td>${row.hallazgosTotales ?? "-"}</td>
      <td>${row.supervisionesFinalizadas ?? "-"}</td>
      <td>${findingsPerSupervision}</td>
    `;
    operatorRankingTableBody.appendChild(tr);
  });
}

function renderOperatorTable(rows) {
  operatorTableBody.innerHTML = "";

  if (!rows.length) {
    operatorTableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Sin datos</td></tr>';
    return;
  }

  const sortedRows = [...rows].sort((a, b) => {
    const aCompliance = a.cumplimientoPct === null || a.cumplimientoPct === undefined
      ? -1
      : Number(a.cumplimientoPct);
    const bCompliance = b.cumplimientoPct === null || b.cumplimientoPct === undefined
      ? -1
      : Number(b.cumplimientoPct);

    if (bCompliance !== aCompliance) {
      return bCompliance - aCompliance;
    }

    if (Number(b.preguntasEvaluables || 0) !== Number(a.preguntasEvaluables || 0)) {
      return Number(b.preguntasEvaluables || 0) - Number(a.preguntasEvaluables || 0);
    }

    return String(a.operatorName || a.operatorId || "").localeCompare(String(b.operatorName || b.operatorId || ""));
  });

  sortedRows.forEach((row) => {
    const compliance = row.cumplimientoPct === null || row.cumplimientoPct === undefined
      ? "-"
      : `${row.cumplimientoPct}%`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.operatorName || row.operatorId || "-"}</td>
      <td>${row.preguntasEvaluables ?? "-"}</td>
      <td>${row.hallazgosTotales ?? "-"}</td>
      <td>${compliance}</td>
    `;
    operatorTableBody.appendChild(tr);
  });
}

function renderSupervisorTable(rows, showCurrentPeriods) {
  supervisorTableBody.innerHTML = "";

  if (!rows.length) {
    const columnCount = showCurrentPeriods ? 5 : 3;
    supervisorTableBody.innerHTML = `<tr><td colspan="${columnCount}" class="text-muted">Sin datos</td></tr>`;
    return;
  }

  rows.forEach((row) => {
    const compliance = row.monthCompliance || {};
    const complianceLabel = formatComplianceLabel(compliance);

    const tr = document.createElement("tr");
    const currentPeriodCells = showCurrentPeriods
      ? `<td>${row.day?.supervisionesFinalizadas ?? "-"}</td>
         <td>${row.week?.supervisionesFinalizadas ?? "-"}</td>`
      : "";
    tr.innerHTML = `
      <td>${row.supervisorName || row.supervisorId || "-"}</td>
      ${currentPeriodCells}
      <td>${row.month?.supervisionesFinalizadas ?? "-"}</td>
      <td>${complianceLabel}</td>
    `;
    supervisorTableBody.appendChild(tr);
  });
}

function formatComplianceLabel(compliance) {
  const done = Number(compliance.realizadas ?? 0);
  const target = Number(compliance.meta ?? 0);
  const pct = compliance.cumplimientoPct;

  if (!target) {
    return `${done}/0 (-)`;
  }

  const pctText = pct === null || pct === undefined || Number.isNaN(Number(pct)) ? "-" : `${pct}%`;
  return `${done}/${target} (${pctText})`;
}

function renderTrendTable(rows, monthLabel) {
  trendChart.innerHTML = "";

  if (!rows.length) {
    trendChart.hidden = true;
    trendChartEmpty.hidden = false;
    trendChartSummary.textContent = `Sin hallazgos para ${monthLabel}.`;
    return;
  }

  trendChart.hidden = false;
  trendChartEmpty.hidden = true;

  const points = rows.map((row) => ({
    date: String(row.date || ""),
    hallazgos: Number(row.hallazgos || 0)
  }));

  const totalHallazgos = points.reduce((sum, item) => sum + item.hallazgos, 0);
  const maxValue = Math.max(...points.map((item) => item.hallazgos), 0, 1);
  const width = 720;
  const height = 280;
  const padding = { top: 24, right: 20, bottom: 48, left: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const steps = points.length > 1 ? points.length - 1 : 1;
  const lineColor = "#c04b8d";
  const pointFill = "#ffffff";
  const axisColor = "#8a627f";
  const gridColor = "rgba(122, 47, 112, 0.18)";
  const textColor = "#6e5b6a";

  trendChartSummary.textContent = `Total de ${monthLabel}: ${totalHallazgos} hallazgos.`;

  const yTicks = buildTrendTicks(maxValue);
  const svgParts = [];
  svgParts.push(`<svg viewBox="0 0 ${width} ${height}" class="trend-chart-svg" role="img" aria-label="Grafica de linea y puntos de hallazgos por dia">`);

  yTicks.forEach((tick) => {
    const y = padding.top + innerHeight - (tick / maxValue) * innerHeight;
    svgParts.push(`<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="trend-grid-line" />`);
    svgParts.push(`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="trend-axis-label">${tick}</text>`);
  });

  svgParts.push(`<line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${width - padding.right}" y2="${padding.top + innerHeight}" class="trend-axis-line" />`);

  const polylinePoints = points.map((item, index) => {
    const x = padding.left + (index / steps) * innerWidth;
    const y = padding.top + innerHeight - (item.hallazgos / maxValue) * innerHeight;
    return `${x},${y}`;
  }).join(" ");

  svgParts.push(`<polyline fill="none" points="${polylinePoints}" class="trend-line" />`);

  const labelInterval = points.length > 12 ? Math.ceil(points.length / 8) : 1;
  points.forEach((item, index) => {
    const x = padding.left + (index / steps) * innerWidth;
    const y = padding.top + innerHeight - (item.hallazgos / maxValue) * innerHeight;
    const label = formatTrendDate(item.date);

    svgParts.push(`<circle cx="${x}" cy="${y}" r="${points.length > 12 ? 3 : 5}" class="trend-point"><title>${label}: ${item.hallazgos} hallazgos</title></circle>`);
    if (index % labelInterval === 0 || index === points.length - 1) {
      svgParts.push(`<text x="${x}" y="${padding.top + innerHeight + 22}" text-anchor="middle" class="trend-axis-label">${label}</text>`);
      if (points.length <= 12) {
        svgParts.push(`<text x="${x}" y="${y - 10}" text-anchor="middle" class="trend-value-label">${item.hallazgos}</text>`);
      }
    }
  });

  svgParts.push("</svg>");
  trendChart.innerHTML = svgParts.join("");
}

function buildTrendTicks(maxValue) {
  if (maxValue <= 1) {
    return [0, 1];
  }

  var tickCount = 4;
  var step = Math.ceil(maxValue / tickCount);
  var ticks = [];

  for (var value = 0; value <= maxValue; value += step) {
    ticks.push(value);
  }

  if (ticks[ticks.length - 1] !== maxValue) {
    ticks.push(maxValue);
  }

  return ticks;
}

function formatTrendDate(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return raw || "-";
  }
  return `${match[3]}/${match[2]}`;
}

function getCurrentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatMonthLabel(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return value || "Mes seleccionado";
  }

  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" })
    .format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

function renderAreaTable(rows) {
  areaTableBody.innerHTML = "";

  if (!rows.length) {
    areaTableBody.innerHTML = '<tr><td colspan="3" class="text-muted">Sin datos</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.areaName || row.areaId || "-"}</td>
      <td>${row.hallazgos ?? "-"}</td>
      <td>${row.supervisiones ?? "-"}</td>
    `;
    areaTableBody.appendChild(tr);
  });
}

function renderTimeMetrics(metrics) {
  const global = metrics.global || {};
  timeGlobal.textContent = `Promedio global: ${formatMetric(global.duracionPromedioMin)} min | P90: ${formatMetric(global.duracionP90Min)} min`;

  const rows = metrics.bySupervisor || [];
  timeBySupervisorTableBody.innerHTML = "";

  if (!rows.length) {
    timeBySupervisorTableBody.innerHTML = '<tr><td colspan="3" class="text-muted">Sin datos</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.supervisorName || row.supervisorId || "-"}</td>
      <td>${formatMetric(row.duracionPromedioMin)}</td>
      <td>${formatMetric(row.duracionP90Min)}</td>
    `;
    timeBySupervisorTableBody.appendChild(tr);
  });
}

function formatMetric(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function setMessage(message, type) {
  indicadoresMessage.textContent = message;
  indicadoresMessage.className = "status-slot mt-3";
  if (type) {
    indicadoresMessage.classList.add(type);
  }
}
