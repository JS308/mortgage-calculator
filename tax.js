(function () {
  const taxForm = document.getElementById("tax-form");
  if (!taxForm) return;

  const taxMessage = document.getElementById("tax-message");
  const taxResult = document.getElementById("tax-result");
  const resaleFields = document.getElementById("tax-resale-fields");
  const buyerFields = document.getElementById("tax-buyer-fields");
  const sellerFields = document.getElementById("tax-seller-fields");
  const sellerModeInput = document.getElementById("tax-seller-mode");
  const modeNewBtn = document.getElementById("tax-mode-new");
  const modeResaleBtn = document.getElementById("tax-mode-resale");
  const payCashBtn = document.getElementById("tax-pay-cash");
  const payLoanBtn = document.getElementById("tax-pay-loan");
  const downPaymentWrap = document.getElementById("tax-down-payment-wrap");
  const detailList = document.getElementById("tax-detail-list");
  const overTwoSelect = document.getElementById("tax-over-two");
  const uniqueFiveSelect = document.getElementById("tax-unique-five");
  const submitBtn = document.getElementById("tax-submit");

  let taxMode = "new";
  let payMode = "cash";

  function setModeButton(button, active) {
    button.className = active
      ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
      : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800";
  }

  function isSellerMode() {
    return taxMode === "resale" && sellerModeInput.checked;
  }

  function syncSellerUi() {
    const seller = isSellerMode();
    sellerFields.hidden = !seller;
    buyerFields.hidden = seller;
    submitBtn.textContent = seller ? "计算净得价" : "计算税费";
    taxMessage.textContent = "";
  }

  function setTaxMode(mode) {
    taxMode = mode;
    const isNew = mode === "new";
    setModeButton(modeNewBtn, isNew);
    setModeButton(modeResaleBtn, !isNew);
    resaleFields.hidden = isNew;
    if (isNew) {
      sellerModeInput.checked = false;
    }
    syncSellerUi();
    if (!isSellerMode()) {
      setPayMode(payMode);
    }
  }

  function setPayMode(mode) {
    payMode = mode;
    const isCash = mode === "cash";
    setModeButton(payCashBtn, isCash);
    setModeButton(payLoanBtn, !isCash);
    downPaymentWrap.hidden = isCash || isSellerMode();
    taxMessage.textContent = "";
  }

  function readNumber(id) {
    const raw = document.getElementById(id).value.trim().replace(/,/g, "");
    if (raw === "") return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return NaN;
    return value;
  }

  function roundMoney(amount) {
    return Math.round(amount * 100) / 100;
  }

  function deedTaxRate(isFirst, area) {
    if (isFirst) return area <= 90 ? 0.01 : 0.015;
    return area <= 90 ? 0.01 : 0.02;
  }

  function deedTaxNote(isFirst, area, rate) {
    const home = isFirst ? "首套" : "二套";
    const size = area <= 90 ? "面积≤90㎡" : "面积>90㎡";
    return home + "、" + size + "，按 " + (rate * 100).toFixed(rate === 0.015 ? 1 : 0) + "%";
  }

  function formatWanAmount(amountYuan) {
    const wan = roundMoney(amountYuan) / 10000;
    let text = wan.toFixed(4).replace(/0+$/, "");
    if (text.endsWith(".")) text = text.slice(0, -1);
    if (!text.includes(".")) {
      text += ".00";
    } else if (text.split(".")[1].length === 1) {
      text += "0";
    }
    return text;
  }

  function formatWanLabel(amountYuan) {
    return formatWanAmount(amountYuan) + " 万元";
  }

  function calcPurchaseTax(input) {
    const priceYuan = roundMoney(input.priceWan * 10000);
    const rate = deedTaxRate(input.isFirst, input.area);
    const deed = roundMoney(priceYuan * rate);
    const items = [
      {
        name: "契税",
        amount: deed,
        note: deedTaxNote(input.isFirst, input.area, rate),
      },
    ];

    if (input.mode === "new") {
      const maintenance = roundMoney(input.area * 100);
      items.push({
        name: "维修基金",
        amount: maintenance,
        note: "按 100 元/平米预估",
      });
      items.push({
        name: "产权登记费",
        amount: 80,
        note: "固定 80 元",
      });
    } else {
      const vatRate = input.overTwo ? 0 : 0.053;
      const vat = roundMoney(priceYuan * vatRate);
      items.push({
        name: "增值税及附加",
        amount: vat,
        note: input.overTwo ? "满 2 年免征" : "不满 2 年，按总价 5.3%",
      });

      const incomeRate = input.uniqueFive ? 0 : 0.01;
      const incomeTax = roundMoney(priceYuan * incomeRate);
      items.push({
        name: "个人所得税",
        amount: incomeTax,
        note: input.uniqueFive ? "满五唯一免征" : "非满五唯一，按总价 1%",
      });

      const agency = roundMoney(priceYuan * (input.agencyRate / 100));
      items.push({
        name: "中介费",
        amount: agency,
        note: "按中介费率 " + input.agencyRate + "%",
      });
    }

    const totalFees = roundMoney(items.reduce(function (sum, item) {
      return sum + item.amount;
    }, 0));
    const downRatio = input.downPaymentRatio / 100;
    const downPayment = roundMoney(priceYuan * downRatio);
    return {
      kind: "buyer",
      priceYuan: priceYuan,
      items: items,
      totalFees: totalFees,
      cashAll: roundMoney(priceYuan + totalFees),
      cashLoan: roundMoney(downPayment + totalFees),
      downPayment: downPayment,
      downPaymentRatio: input.downPaymentRatio,
      payMode: input.payMode,
    };
  }

  function calcSellerNet(input) {
    const saleYuan = roundMoney(input.saleWan * 10000);
    const buyYuan = roundMoney(input.buyWan * 10000);
    const remainingLoan = roundMoney(input.remainingLoanWan * 10000);

    const vatRate = input.overTwo ? 0 : 0.053;
    const vat = roundMoney(saleYuan * vatRate);
    const incomeRate = input.uniqueFive ? 0 : 0.01;
    const incomeTax = roundMoney(saleYuan * incomeRate);
    const agency = roundMoney(saleYuan * (input.agencyRate / 100));

    const items = [
      {
        name: "卖出价",
        amount: saleYuan,
        note: "现在的成交价",
        sign: "+",
      },
      {
        name: "当年买入价",
        amount: buyYuan,
        note: "仅作对照，不直接扣减到手价",
        sign: "info",
      },
      {
        name: "剩余房贷",
        amount: remainingLoan,
        note: "需先还清或过户时扣减",
        sign: "-",
      },
      {
        name: "卖方增值税及附加",
        amount: vat,
        note: input.overTwo ? "满 2 年免征" : "不满 2 年，按卖出价 5.3%",
        sign: "-",
      },
      {
        name: "卖方个人所得税",
        amount: incomeTax,
        note: input.uniqueFive ? "满五唯一免征" : "非满五唯一，按卖出价 1%",
        sign: "-",
      },
      {
        name: "中介费",
        amount: agency,
        note: "按中介费率 " + input.agencyRate + "%",
        sign: "-",
      },
    ];

    const deductions = roundMoney(remainingLoan + vat + incomeTax + agency);
    const netCash = roundMoney(saleYuan - deductions);
    return {
      kind: "seller",
      items: items,
      totalFees: deductions,
      netCash: netCash,
      saleYuan: saleYuan,
      buyYuan: buyYuan,
    };
  }

  function renderDetailItems(items) {
    detailList.innerHTML = items
      .map(function (item) {
        const amountText =
          item.sign === "-"
            ? "-" + formatWanLabel(item.amount)
            : item.sign === "+"
              ? "+" + formatWanLabel(item.amount)
              : formatWanLabel(item.amount);
        return (
          '<li class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">' +
          '<div class="flex items-start justify-between gap-3">' +
          '<div><p class="text-sm font-semibold text-slate-800">' +
          item.name +
          '</p><p class="mt-1 text-xs leading-relaxed text-slate-500">' +
          item.note +
          "</p></div>" +
          '<p class="text-base font-semibold tabular-nums text-slate-900">' +
          amountText +
          "</p></div></li>"
        );
      })
      .join("");
  }

  function renderBuyerResult(result) {
    const itemSum = roundMoney(
      result.items.reduce(function (sum, item) {
        return sum + item.amount;
      }, 0)
    );
    if (itemSum !== result.totalFees) {
      taxMessage.textContent = "计算结果异常：分项合计与总计不一致";
      return;
    }

    document.getElementById("tax-buyer-result").hidden = false;
    document.getElementById("tax-seller-result").hidden = true;
    document.getElementById("tax-ledger").hidden = false;
    document.getElementById("tax-total-wan").textContent = formatWanAmount(result.totalFees);
    renderDetailItems(
      result.items.map(function (item) {
        return {
          name: item.name,
          amount: item.amount,
          note: item.note,
          sign: "",
        };
      })
    );

    const showCash = result.payMode === "cash";
    document.getElementById("tax-cash-all-block").hidden = !showCash;
    document.getElementById("tax-cash-loan-block").hidden = showCash;
    document.getElementById("tax-cash-all").textContent = formatWanLabel(result.cashAll);
    document.getElementById("tax-cash-loan").textContent = formatWanLabel(result.cashLoan);
    document.getElementById("tax-cash-loan-note").textContent =
      "首付按总价 " + result.downPaymentRatio + "% + 各项税费";
    taxResult.hidden = false;
  }

  function renderSellerResult(result) {
    const check = roundMoney(result.saleYuan - result.totalFees);
    if (check !== result.netCash) {
      taxMessage.textContent = "计算结果异常：净得价与扣减项不一致";
      return;
    }

    document.getElementById("tax-buyer-result").hidden = true;
    document.getElementById("tax-seller-result").hidden = false;
    document.getElementById("tax-ledger").hidden = true;
    document.getElementById("tax-seller-net").textContent = formatWanAmount(result.netCash);
    renderDetailItems(result.items);
    taxResult.hidden = false;
  }

  // 满五唯一必然已满五年，也就必然满 2 年；两项仍独立选择，只做联动。
  uniqueFiveSelect.addEventListener("change", function () {
    if (uniqueFiveSelect.value === "yes") {
      overTwoSelect.value = "yes";
    }
  });
  overTwoSelect.addEventListener("change", function () {
    if (overTwoSelect.value === "no" && uniqueFiveSelect.value === "yes") {
      uniqueFiveSelect.value = "no";
    }
  });

  sellerModeInput.addEventListener("change", syncSellerUi);

  modeNewBtn.addEventListener("click", function () {
    setTaxMode("new");
  });
  modeResaleBtn.addEventListener("click", function () {
    setTaxMode("resale");
  });
  payCashBtn.addEventListener("click", function () {
    setPayMode("cash");
  });
  payLoanBtn.addEventListener("click", function () {
    setPayMode("loan");
  });

  taxForm.addEventListener("submit", function (event) {
    event.preventDefault();
    taxMessage.textContent = "";

    let overTwo = true;
    let uniqueFive = true;
    let agencyRate = 2;

    if (taxMode === "resale") {
      overTwo = overTwoSelect.value === "yes";
      uniqueFive = uniqueFiveSelect.value === "yes";
      agencyRate = readNumber("tax-agency-rate");
      if (agencyRate == null) agencyRate = 2;
      if (!Number.isFinite(agencyRate) || agencyRate < 0) {
        taxMessage.textContent = "中介费率需为大于等于 0 的数字";
        return;
      }
    }

    if (isSellerMode()) {
      const buyWan = readNumber("tax-buy-price");
      const saleWan = readNumber("tax-sell-price");
      let remainingLoanWan = readNumber("tax-remaining-loan");
      if (remainingLoanWan == null) remainingLoanWan = 0;
      if (buyWan == null || saleWan == null) {
        taxMessage.textContent = "请填写当年买入价和现在卖出价";
        return;
      }
      if (!Number.isFinite(buyWan) || buyWan < 0) {
        taxMessage.textContent = "当年买入价需大于等于 0";
        return;
      }
      if (!Number.isFinite(saleWan) || saleWan <= 0) {
        taxMessage.textContent = "现在卖出价需大于 0";
        return;
      }
      if (!Number.isFinite(remainingLoanWan) || remainingLoanWan < 0) {
        taxMessage.textContent = "剩余房贷需大于等于 0";
        return;
      }

      renderSellerResult(
        calcSellerNet({
          buyWan: buyWan,
          saleWan: saleWan,
          remainingLoanWan: remainingLoanWan,
          overTwo: overTwo,
          uniqueFive: uniqueFive,
          agencyRate: agencyRate,
        })
      );
      return;
    }

    const priceWan = readNumber("tax-price");
    const area = readNumber("tax-area");
    if (priceWan == null || area == null) {
      taxMessage.textContent = "请填写房屋总价和面积";
      return;
    }
    if (!Number.isFinite(priceWan) || priceWan <= 0) {
      taxMessage.textContent = "房屋总价需大于 0";
      return;
    }
    if (!Number.isFinite(area) || area <= 0) {
      taxMessage.textContent = "房屋面积需大于 0";
      return;
    }

    const isFirst = document.getElementById("tax-home-type").value === "first";
    let downPaymentRatio = 30;
    if (payMode === "loan") {
      downPaymentRatio = readNumber("tax-down-payment");
      if (downPaymentRatio == null) downPaymentRatio = 30;
      if (!Number.isFinite(downPaymentRatio) || downPaymentRatio <= 0 || downPaymentRatio > 100) {
        taxMessage.textContent = "首付比例需在 0 到 100 之间";
        return;
      }
    }

    renderBuyerResult(
      calcPurchaseTax({
        mode: taxMode,
        payMode: payMode,
        priceWan: priceWan,
        area: area,
        isFirst: isFirst,
        overTwo: overTwo,
        uniqueFive: uniqueFive,
        agencyRate: agencyRate,
        downPaymentRatio: downPaymentRatio,
      })
    );
  });

  setTaxMode("new");
  setPayMode("cash");

  window.calcPurchaseTax = calcPurchaseTax;
  window.calcSellerNet = calcSellerNet;
  window.formatWanAmount = formatWanAmount;
})();
