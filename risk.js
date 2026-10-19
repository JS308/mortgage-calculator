const riskPaymentInput = document.getElementById("risk-payment");
const riskMessage = document.getElementById("risk-message");
const riskResult = document.getElementById("risk-result");
const riskAge = document.getElementById("risk-age");

function fillRiskAges() {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "请选择";
  riskAge.appendChild(placeholder);
  for (let age = 18; age <= 70; age += 1) {
    const option = document.createElement("option");
    option.value = String(age);
    option.textContent = age + " 岁";
    riskAge.appendChild(option);
  }
}

function unemploymentMonths(age, industry) {
  let months = Math.round(6 + (age - 35) * 0.4);
  if (industry === "stable") months -= 2;
  if (industry === "internet") months += 3;
  return Math.max(1, months);
}

function readMoney(id) {
  const raw = document.getElementById(id).value.trim().replace(/,/g, "");
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return NaN;
  return value;
}

function assessAbility(input) {
  const targetMonths = unemploymentMonths(input.age, input.industry);
  const assets = roundMoney(input.savingsYuan + input.severanceYuan);
  const spouse = input.dual ? input.spouse : 0;
  const outflow = roundMoney(input.payment + input.living + input.debt - spouse);
  const survivalMonths = outflow <= 0 ? Infinity : assets / outflow;
  const safePayment = roundMoney(assets / targetMonths + spouse - input.living - input.debt);
  let tone = "safe";
  if (isFinite(survivalMonths) && survivalMonths < targetMonths) tone = "danger";
  else if (isFinite(survivalMonths) && survivalMonths < 12) tone = "watch";
  return { targetMonths, assets, outflow, survivalMonths, safePayment, tone, dual: input.dual };
}

function formatRiskMonths(value) {
  if (!isFinite(value)) return "无限";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function industryLabel(industry) {
  if (industry === "stable") return "体制内/国企，预计周期减少 2 个月";
  if (industry === "internet") return "互联网/私企，预计周期增加 3 个月";
  if (industry === "traditional") return "传统行业，预计周期不调整";
  return "未选行业，只按年龄估算";
}

function riskAdvice(input, result) {
  if (input.income > 0 && input.payment / input.income > 0.5) {
    return "您的月供占家庭收入比例过高，建议预留更多备用金，或暂缓买房/提前还款。";
  }
  if (result.tone === "danger") {
    return "以当前存款，撑不到预计的找工作周期。建议先增加备用金，或把月供降到安全上限以内。";
  }
  if (result.safePayment < input.payment) {
    return "当前月供高于安全上限，建议把总月供控制在安全范围内，或预留更多备用金。";
  }
  if (result.tone === "watch") {
    return "能撑过预计的找工作时间，但备用金还不到一年。建议再留一笔应急资金。";
  }
  return "以现有存款和支出，失业期间的月供压力仍在安全范围内。";
}

function renderRisk(input, result) {
  const months = document.getElementById("risk-months");
  const unit = document.getElementById("risk-months-unit");
  const gauge = document.getElementById("risk-gauge");
  months.textContent = formatRiskMonths(result.survivalMonths);
  unit.textContent = "个月的零收入状态";
  const targetText = result.targetMonths + " 个月";
  document.getElementById("risk-target").textContent = targetText;
  if (result.outflow < 0) {
    document.getElementById("risk-outflow").textContent = "结余 " + formatYuan(Math.abs(result.outflow));
  } else if (result.outflow === 0) {
    document.getElementById("risk-outflow").textContent = "0 元";
  } else {
    document.getElementById("risk-outflow").textContent = formatYuan(result.outflow);
  }
  const safeShown = result.safePayment > 0 ? result.safePayment : 0;
  document.getElementById("risk-safe").textContent = formatYuan(safeShown);
  gauge.className = "risk-gauge mt-4 is-" + result.tone;
  if (result.tone === "danger") {
    gauge.textContent = "🔴 高危：撑不过预计找工作的" + result.targetMonths + "个月";
  } else if (result.tone === "watch") {
    gauge.textContent = "🟡 紧张：能撑过找工作的" + result.targetMonths + "个月，但不足 1 年";
  } else if (!isFinite(result.survivalMonths)) {
    gauge.textContent = "🟢 稳健：配偶收入已覆盖每月开支，存款不会下降";
  } else {
    gauge.textContent = "🟢 稳健：足以支撑 1 年以上";
  }
  document.getElementById("risk-advice").textContent = riskAdvice(input, result);
  const who = result.dual ? "按双职工、一方失业计算。" : "按单职工失业计算。";
  const safeNote = result.safePayment > 0
    ? "若想在 " + result.targetMonths + " 个月内绝对安全，总月供不应超过 " + formatYuan(result.safePayment) + "。"
    : "日常支出和其他负债已经超过这段时间的安全预算，安全月供上限为 0 元。";
  document.getElementById("risk-detail").textContent = who + industryLabel(input.industry) + "。可用资金 " + formatYuan(result.assets) + "。" + safeNote;
  riskResult.hidden = false;
}

function readRiskInput() {
  const payment = readMoney("risk-payment");
  const savingsWan = readMoney("risk-savings");
  const age = Number(riskAge.value);
  const living = readMoney("risk-living");
  const income = readMoney("risk-income");
  const spouse = readMoney("risk-spouse");
  const debt = readMoney("risk-debt");
  const severanceWan = readMoney("risk-severance");
  return {
    payment,
    savingsWan,
    age,
    living: living == null ? 0 : living,
    income: income == null ? 0 : income,
    spouse: spouse == null ? 0 : spouse,
    dual: spouse != null,
    debt: debt == null ? 0 : debt,
    severanceWan: severanceWan == null ? 0 : severanceWan,
    industry: document.getElementById("risk-industry").value,
    livingMissing: living == null ? false : Number.isNaN(living),
  };
}

document.getElementById("risk-form").addEventListener("submit", (event) => {
  event.preventDefault();
  riskMessage.textContent = "";
  const raw = readRiskInput();
  if (raw.payment == null || Number.isNaN(raw.payment) || raw.payment <= 0) {
    riskMessage.textContent = "请填写当前房贷月供";
    riskPaymentInput.focus();
    return;
  }
  if (raw.savingsWan == null || Number.isNaN(raw.savingsWan)) {
    riskMessage.textContent = "请填写家庭总存款";
    document.getElementById("risk-savings").focus();
    return;
  }
  if (!Number.isInteger(raw.age) || raw.age < 18 || raw.age > 70) {
    riskMessage.textContent = "请选择年龄";
    riskAge.focus();
    return;
  }
  const optionalIds = ["risk-living", "risk-income", "risk-spouse", "risk-debt", "risk-severance"];
  if (optionalIds.some((id) => Number.isNaN(readMoney(id)))) {
    riskMessage.textContent = "选填金额要是大于或等于 0 的数字";
    return;
  }
  const input = {
    payment: raw.payment,
    savingsYuan: roundMoney(raw.savingsWan * 10000),
    severanceYuan: roundMoney(raw.severanceWan * 10000),
    age: raw.age,
    living: raw.living,
    income: raw.income,
    spouse: raw.spouse,
    dual: raw.dual,
    debt: raw.debt,
    industry: raw.industry,
  };
  renderRisk(input, assessAbility(input));
  riskResult.scrollIntoView({ behavior: "smooth", block: "start" });
});

riskPaymentInput.addEventListener("input", () => {
  riskPaymentInput.dataset.touched = "1";
});

function syncRiskPaymentFromReport() {
  const payment = linkedMortgagePayment();
  if (!(payment > 0)) return;
  if (riskPaymentInput.dataset.touched === "1") return;
  riskPaymentInput.value = String(Math.round(payment));
}

document.getElementById("risk-use-calc").addEventListener("click", () => {
  riskMessage.textContent = "";
  if (!(linkedMortgagePayment() > 0)) {
    riskMessage.textContent = "请先在「提前还款策略」里计算一次月供";
    return;
  }
  delete riskPaymentInput.dataset.touched;
  syncRiskPaymentFromReport();
});

function setTabButton(button, active) {
  button.className = active
    ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
    : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800";
  button.setAttribute("aria-selected", active ? "true" : "false");
}

function showPageTab(name) {
  const calc = name === "calc";
  document.getElementById("panel-calc").hidden = !calc;
  document.getElementById("panel-risk").hidden = calc;
  setTabButton(document.getElementById("tab-calc"), calc);
  setTabButton(document.getElementById("tab-risk"), !calc);
  document.getElementById("page-title").textContent = calc ? "房贷提前还款策略" : "还款能力风险评估";
  document.getElementById("page-subtitle").textContent = calc
    ? "对比提前还款、转贷与机会成本"
    : "估算失业后存款还能撑几个月房贷";
  document.getElementById("method-badge").hidden = !calc;
  if (!calc) syncRiskPaymentFromReport();
}

document.getElementById("tab-calc").addEventListener("click", () => showPageTab("calc"));
document.getElementById("tab-risk").addEventListener("click", () => showPageTab("risk"));

fillRiskAges();
