const riskPaymentInput = document.getElementById("risk-payment");
const riskMessage = document.getElementById("risk-message");
const riskResult = document.getElementById("risk-result");
const riskAge = document.getElementById("risk-age");

const RISK_AGE_BANDS = [
  { value: 25, label: "25岁及以下", months: 3, chance: "这个年龄段岗位选择还比较多，再就业机会较大" },
  { value: 30, label: "26-30岁", months: 4, chance: "再就业机会仍然比较多" },
  { value: 35, label: "31-35岁", months: 6, chance: "对口岗位开始变挑，按 6 个月准备" },
  { value: 40, label: "36-40岁", months: 9, chance: "年龄上去之后，合适的机会变少" },
  { value: 45, label: "41-45岁", months: 12, chance: "再就业机会已经明显变小" },
  { value: 50, label: "46-50岁", months: 16, chance: "市场对这个年龄段更挑剔，找到合适工作的机会较小" },
  { value: 55, label: "51-55岁", months: 20, chance: "对口岗位少，找到工作的机会很小" },
  { value: 60, label: "56岁及以上", months: 24, chance: "年龄越大机会越小，模型按两年准备" },
];

function fillRiskAges() {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "请选择";
  riskAge.appendChild(placeholder);
  RISK_AGE_BANDS.forEach((band) => {
    const option = document.createElement("option");
    option.value = String(band.value);
    option.textContent = band.label;
    riskAge.appendChild(option);
  });
}

function ageBand(age) {
  return RISK_AGE_BANDS.find((band) => band.value === age) || null;
}

function unemploymentPlan(age, industry, children) {
  const band = ageBand(age);
  const agePart = band ? band.months : 6;
  let industryPart = 0;
  if (industry === "stable") industryPart = -2;
  if (industry === "internet") industryPart = 3;
  const childPart = Math.min(3, Math.max(0, children));
  const months = Math.max(1, Math.min(36, agePart + industryPart + childPart));
  return { months, agePart, industryPart, childPart, band };
}

function readMoney(id) {
  const raw = document.getElementById(id).value.trim().replace(/,/g, "");
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return NaN;
  return value;
}

function formatRiskYuan(amount) {
  const sign = amount < 0 ? "-" : "";
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString("zh-CN")
    : rounded.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return sign + text + " 元";
}

const DEFAULT_LIVING = 3000;

function assessAbility(input) {
  const plan = unemploymentPlan(input.age, input.industry, input.children);
  const childCost = input.livingFilled ? 0 : input.children * 2000;
  const living = roundMoney(input.living + childCost);
  const assets = roundMoney(input.savingsYuan + input.severanceYuan);
  const spouse = input.dual ? input.spouse : 0;
  const netExpense = roundMoney(living + input.debt - spouse);
  const outflow = roundMoney(input.payment + netExpense);
  const survivalMonths = outflow <= 0 ? Infinity : assets / outflow;
  const liquidityRaw = plan.months > 0 ? (assets - netExpense * plan.months) / plan.months / 1.5 : 0;
  const liquiditySafe = roundMoney(Math.max(0, liquidityRaw));
  const dtiCap = input.income > 0 ? roundMoney(input.income * 0.36) : null;
  const safePayment = dtiCap == null ? liquiditySafe : roundMoney(Math.min(liquiditySafe, dtiCap));
  const incomeRatio = input.income > 0 ? Math.round(input.payment / input.income * 100) : null;
  const stress = stressCase(input.payment, input.income);
  let tone = "safe";
  if (isFinite(survivalMonths) && survivalMonths < plan.months) tone = "danger";
  else if (isFinite(survivalMonths) && survivalMonths < 12) tone = "watch";
  return {
    targetMonths: plan.months,
    plan,
    childCost,
    living,
    assets,
    outflow,
    survivalMonths,
    safePayment,
    tone,
    dual: input.dual,
    netExpense,
    liquiditySafe,
    dtiCap,
    incomeRatio,
    stress,
    reserveTone: reserveTone(survivalMonths),
  };
}

function reserveTone(survivalMonths) {
  if (!isFinite(survivalMonths)) return "safe";
  if (survivalMonths < 3) return "danger";
  if (survivalMonths <= 6) return "watch";
  return "safe";
}

function reserveLabel(tone) {
  if (tone === "danger") return "高风险";
  if (tone === "watch") return "中等";
  return "相对安全";
}

function dtiBand(ratio) {
  if (ratio == null) return null;
  if (ratio > 43) return "danger";
  if (ratio > 36) return "watch";
  return "safe";
}

function dtiSentence(ratio) {
  const band = dtiBand(ratio);
  if (band === "danger") return "DTI超过43%的合格抵押贷款通用红线，风险较高。";
  if (band === "watch") return "DTI超过36%，高于手动承保的保守标准。";
  if (band === "safe") return "DTI处于健康范围。";
  return "";
}

function stressCase(payment, income) {
  const linked = typeof linkedMortgageStress === "function" ? linkedMortgageStress() : null;
  if (!linked) return null;
  const paymentShock = Math.abs(payment - linked.basePayment) < 1
    ? linked.payment
    : roundMoney(payment * linked.payment / linked.basePayment);
  const ratio = income > 0 ? Math.round(paymentShock / income * 100) : null;
  return { payment: paymentShock, ratio };
}

function formatRiskMonths(value) {
  if (!isFinite(value)) return "无限";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function industryPhrase(industry, part) {
  if (industry === "stable") return "体制内或国企岗位相对稳，找工作时间少算 " + Math.abs(part) + " 个月";
  if (industry === "internet") return "互联网或私企波动更大，找工作时间多算 " + part + " 个月";
  if (industry === "traditional") return "传统行业没有再加减月份";
  return "没有选行业，这一项不调整";
}

function riskConclusion(input, result) {
  const band = result.plan.band;
  const gap = isFinite(result.survivalMonths) ? Math.max(0, result.targetMonths - result.survivalMonths) : 0;
  let judgment;
  if (result.tone === "danger") {
    judgment = "流动性覆盖为 " + formatRiskMonths(result.survivalMonths) + " 个月，低于预计 " + result.targetMonths + " 个月的失业周期，缺口约 " + formatRiskMonths(gap) + " 个月。建议将月供控制在建议安全月供以内，或补充流动性储备。";
  } else if (!isFinite(result.survivalMonths)) {
    judgment = "配偶税后收入已覆盖房贷、日常支出及其他负债，月度净现金流出不再消耗可用资金。";
  } else if (result.tone === "watch") {
    judgment = "流动性覆盖达到预计 " + result.targetMonths + " 个月失业周期，但不足 12 个月。建议提高流动性储备。";
  } else {
    judgment = "流动性覆盖达到预计 " + result.targetMonths + " 个月失业周期，且超过 12 个月。按当前债务收入结构，短期失业的流动性压力可控。";
  }

  const notes = [];
  if (!input.livingFilled) notes.push("因未填日常开支，按每月 3000 元最低标准估算。");
  if (result.incomeRatio != null) {
    notes.push("债务收入比 DTI 为 " + result.incomeRatio + "%。" + dtiSentence(result.incomeRatio));
  } else {
    notes.push("未填写家庭税后月总收入，债务收入比无法计算。");
  }
  if (result.stress) {
    const ratioText = result.stress.ratio == null ? "未填写家庭税后月总收入，无法计算届时的债务收入比。" : "届时DTI将达到 " + result.stress.ratio + "%。";
    notes.push("如果利率上涨3%，您的月供将变为 " + formatRiskYuan(result.stress.payment) + "，" + ratioText);
  } else {
    notes.push("尚未关联贷款利率与剩余期限，无法重算利率上浮 3 个百分点后的月供。请先在「提前还款策略」中计算。");
  }

  const adjust = ["年龄档 " + result.plan.agePart + " 个月"];
  if (result.plan.industryPart > 0) adjust.push("行业 +" + result.plan.industryPart + " 个月");
  if (result.plan.industryPart < 0) adjust.push("行业 -" + Math.abs(result.plan.industryPart) + " 个月");
  if (result.plan.childPart > 0) adjust.push("子女负担 +" + result.plan.childPart + " 个月");
  const details = [];
  details.push("年龄区间：" + (band ? band.label : "未选择") + "。" + (band ? band.chance : "") + "。预计失业周期 " + result.targetMonths + " 个月，构成：" + adjust.join("，") + "。" + industryPhrase(input.industry, result.plan.industryPart) + "。");

  const money = [];
  if (input.income > 0) money.push("家庭税后月总收入 " + formatRiskYuan(input.income) + "，债务收入比 " + result.incomeRatio + "%。");
  if (input.children > 0) {
    money.push("子女 " + input.children + " 人，失业周期增加 " + result.plan.childPart + " 个月。");
    if (result.childCost > 0) {
      money.push("日常支出未填。在每月 3,000 元最低标准之外，按每名子女 2,000 元估算，该项为 " + formatRiskYuan(result.childCost) + "。填写日常支出后不再重复计入。");
    } else {
      money.push("日常支出已填写，子女支出按已包含处理。");
    }
  }
  if (money.length) details.push(money.join(""));

  const flow = result.outflow < 0
    ? "计入配偶税后收入后，月度净结余 " + formatRiskYuan(Math.abs(result.outflow)) + "。"
    : "月度净流出 " + formatRiskYuan(Math.max(0, result.outflow)) + "，可用资金 " + formatRiskYuan(result.assets) + "，流动性覆盖 " + formatRiskMonths(result.survivalMonths) + " 个月。";
  const safeShown = result.safePayment > 0 ? result.safePayment : 0;
  const capText = result.dtiCap == null
    ? "未提供家庭税后月总收入，建议安全月供只采用流动性口径。"
    : "债务收入比口径为家庭税后月总收入的 36%，即 " + formatRiskYuan(result.dtiCap) + "。";
  const safeLine = "流动性口径为 (可用资金 − 非房贷月支出 × 失业周期) / 失业周期 / 1.5，结果 " + formatRiskYuan(result.liquiditySafe) + "。" + capText + "两者取较低值，建议安全月供为 " + formatRiskYuan(safeShown) + "。当前月供 " + formatRiskYuan(input.payment) + (input.payment > safeShown ? "，已高于该上限。" : "，未超过该上限。");
  details.push(flow + safeLine);
  details.push(result.dual ? "按双职工、一方失业测算。" : "按单职工失业测算。");
  return { judgment, notes, details };
}

function renderRisk(input, result) {
  const months = document.getElementById("risk-months");
  const unit = document.getElementById("risk-months-unit");
  const gauge = document.getElementById("risk-gauge");
  months.textContent = formatRiskMonths(result.survivalMonths);
  unit.textContent = "个月";
  const benchmark = document.getElementById("risk-benchmark");
  benchmark.className = "risk-benchmark mt-2 is-" + result.reserveTone;
  benchmark.textContent = "（国际建议：3-6个月基本生活支出）" + reserveLabel(result.reserveTone);
  const targetText = result.targetMonths + " 个月";
  document.getElementById("risk-target").textContent = targetText;
  if (result.outflow < 0) {
    document.getElementById("risk-outflow").textContent = "结余 " + formatRiskYuan(Math.abs(result.outflow));
  } else if (result.outflow === 0) {
    document.getElementById("risk-outflow").textContent = "0 元";
  } else {
    document.getElementById("risk-outflow").textContent = formatRiskYuan(result.outflow);
  }
  const safeShown = result.safePayment > 0 ? result.safePayment : 0;
  document.getElementById("risk-safe").textContent = formatRiskYuan(safeShown);
  const dtiCard = document.getElementById("risk-dti-card");
  const dtiBandName = dtiBand(result.incomeRatio);
  dtiCard.className = "risk-metric rounded-xl p-4 " + (dtiBandName ? "is-" + dtiBandName : "bg-slate-50");
  document.getElementById("risk-dti").textContent = result.incomeRatio == null ? "—" : result.incomeRatio + "%";
  document.getElementById("risk-stress").textContent = result.stress ? formatRiskYuan(result.stress.payment) : "—";
  gauge.className = "risk-gauge mt-4 is-" + result.tone;
  if (result.tone === "danger") {
    gauge.textContent = "高风险：流动性覆盖低于预计 " + result.targetMonths + " 个月失业周期";
  } else if (result.tone === "watch") {
    gauge.textContent = "关注：已覆盖预计失业周期，但不足 12 个月";
  } else if (!isFinite(result.survivalMonths)) {
    gauge.textContent = "稳健：持续收入已覆盖月度现金流出";
  } else {
    gauge.textContent = "稳健：流动性覆盖超过 12 个月";
  }
  const advice = document.getElementById("risk-advice");
  advice.replaceChildren();
  const overCap = input.payment > safeShown;
  const card = document.createElement("div");
  card.className = "risk-safe-card " + (overCap ? "is-over" : "is-ok");
  const kicker = document.createElement("p");
  kicker.className = "risk-safe-kicker";
  kicker.textContent = "建议安全月供";
  const line = document.createElement("p");
  line.className = "risk-safe-line";
  line.textContent = result.dtiCap == null
    ? "为覆盖预计 " + result.targetMonths + " 个月失业周期，建议月供不超过 " + formatRiskYuan(safeShown) + "。"
    : "为覆盖预计 " + result.targetMonths + " 个月失业周期，且债务收入比不超过 36%，建议月供不超过 " + formatRiskYuan(safeShown) + "。";
  card.append(kicker, line);
  advice.appendChild(card);

  const conclusion = riskConclusion(input, result);
  const judgment = document.createElement("p");
  judgment.className = "text-base font-semibold leading-relaxed text-slate-900";
  judgment.textContent = conclusion.judgment;
  advice.appendChild(judgment);
  conclusion.notes.forEach((text, index) => {
    const paragraph = document.createElement("p");
    const warning = text.indexOf("通用红线") !== -1;
    const caution = text.indexOf("手动承保") !== -1;
    paragraph.className = warning
      ? "risk-note-danger text-sm font-semibold leading-relaxed"
      : caution
        ? "risk-note-watch text-sm font-semibold leading-relaxed"
        : "text-sm leading-relaxed text-slate-700";
    if (index === 0 && !input.livingFilled) paragraph.className += " risk-estimate-note";
    paragraph.textContent = text;
    advice.appendChild(paragraph);
  });

  const details = document.createElement("details");
  details.className = "risk-detail";
  const summary = document.createElement("summary");
  summary.textContent = "计算明细";
  details.appendChild(summary);
  conclusion.details.forEach((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    details.appendChild(paragraph);
  });
  advice.appendChild(details);
  riskResult.hidden = false;
}

function readRiskInput() {
  const payment = readMoney("risk-payment");
  const savings = readMoney("risk-savings");
  const age = Number(riskAge.value);
  const living = readMoney("risk-living");
  const income = readMoney("risk-income");
  const spouse = readMoney("risk-spouse");
  const debt = readMoney("risk-debt");
  const severance = readMoney("risk-severance");
  const children = Number(document.getElementById("risk-children").value);
  return {
    payment,
    savings,
    age,
    living: living == null ? DEFAULT_LIVING : living,
    livingFilled: living != null,
    income: income == null ? 0 : income,
    spouse: spouse == null ? 0 : spouse,
    dual: spouse != null,
    debt: debt == null ? 0 : debt,
    severance: severance == null ? 0 : severance,
    children: Number.isInteger(children) && children > 0 ? Math.min(4, children) : 0,
    industry: document.getElementById("risk-industry").value,
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
  if (raw.savings == null || Number.isNaN(raw.savings)) {
    riskMessage.textContent = "请填写家庭总存款";
    document.getElementById("risk-savings").focus();
    return;
  }
  if (!ageBand(raw.age)) {
    riskMessage.textContent = "请选择年龄区间";
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
    savingsYuan: roundMoney(raw.savings),
    severanceYuan: roundMoney(raw.severance),
    age: raw.age,
    living: raw.living,
    livingFilled: raw.livingFilled,
    income: raw.income,
    spouse: raw.spouse,
    dual: raw.dual,
    debt: raw.debt,
    children: raw.children,
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
  riskPaymentInput.value = formatAmountInput(String(Math.round(payment)));
}

["risk-payment", "risk-savings", "risk-income", "risk-living", "risk-spouse", "risk-debt", "risk-severance"].forEach((id) => {
  bindAmountInput(document.getElementById(id));
});

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
    : "按债务收入比、流动性覆盖和利率压力测试评估还款能力";
  document.getElementById("method-badge").hidden = !calc;
  if (!calc) syncRiskPaymentFromReport();
}

document.getElementById("tab-calc").addEventListener("click", () => showPageTab("calc"));
document.getElementById("tab-risk").addEventListener("click", () => showPageTab("risk"));

fillRiskAges();
