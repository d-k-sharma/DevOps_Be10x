const STORAGE_KEY = "goodbudget.transactions.v1";
const BUDGETS = [
  { name: "Food & dining", icon: "☕", limit: 18000 },
  { name: "Shopping", icon: "◇", limit: 12000 },
  { name: "Transport", icon: "↗", limit: 8000 },
  { name: "Bills & utilities", icon: "⌂", limit: 10000 },
  { name: "Health", icon: "✚", limit: 6000 },
  { name: "Other", icon: "✳", limit: 10000 }
];
const CATEGORIES = {
  expense: ["Food & dining", "Shopping", "Transport", "Bills & utilities", "Health", "Entertainment", "Other"],
  income: ["Salary", "Freelance", "Investment", "Gift", "Other"]
};
const CATEGORY_ICONS = {
  "Food & dining": "☕", Shopping: "◇", Transport: "↗", "Bills & utilities": "⌂",
  Health: "✚", Entertainment: "♫", Other: "✳", Salary: "↙", Freelance: "✎",
  Investment: "⌁", Gift: "♡"
};
const DEFAULT_TRANSACTIONS = [
  { id: "seed-1", name: "Monthly salary", category: "Salary", type: "income", amount: 85000, date: offsetDate(2) },
  { id: "seed-2", name: "Weekly groceries", category: "Food & dining", type: "expense", amount: 2450, date: offsetDate(1) },
  { id: "seed-3", name: "Electricity bill", category: "Bills & utilities", type: "expense", amount: 1860, date: offsetDate(3) },
  { id: "seed-4", name: "Freelance project", category: "Freelance", type: "income", amount: 12000, date: offsetDate(5) },
  { id: "seed-5", name: "Cab ride", category: "Transport", type: "expense", amount: 620, date: offsetDate(6) },
  { id: "seed-6", name: "New headphones", category: "Shopping", type: "expense", amount: 3299, date: offsetDate(8) },
  { id: "seed-7", name: "Dinner with friends", category: "Food & dining", type: "expense", amount: 1750, date: offsetDate(10) },
  { id: "seed-8", name: "Gym membership", category: "Health", type: "expense", amount: 1500, date: offsetDate(12) },
  { id: "seed-9", name: "Coffee & snacks", category: "Food & dining", type: "expense", amount: 480, date: offsetDate(14) }
];

const state = {
  transactions: loadTransactions(),
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  filter: "all",
  showAll: false,
  search: ""
};

const $ = (selector) => document.querySelector(selector);
const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(amount);

function offsetDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return DEFAULT_TRANSACTIONS;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Saved transactions are not a list.");
    return parsed.filter((item) =>
      item && typeof item.name === "string" && Number.isFinite(item.amount) &&
      (item.type === "income" || item.type === "expense") &&
      typeof item.category === "string" && !Number.isNaN(Date.parse(item.date))
    );
  } catch (error) {
    console.error("Could not load saved transactions.", error);
    return DEFAULT_TRANSACTIONS;
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  } catch (error) {
    console.error("Could not save transactions to this device.", error);
    $("#form-error").textContent = "Could not save your transaction. Check browser storage and try again.";
  }
}

function monthTransactions(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return state.transactions.filter((transaction) => {
    const transactionDate = new Date(`${transaction.date}T00:00:00`);
    return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
  });
}

function renderSummary() {
  const transactions = monthTransactions(state.month);
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = state.transactions.reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0);
  const budgetTotal = BUDGETS.reduce((sum, budget) => sum + budget.limit, 0);
  const saved = income - expenses;
  $("#total-balance").textContent = formatCurrency(balance);
  $("#total-income").textContent = formatCurrency(income);
  $("#total-expenses").textContent = formatCurrency(expenses);
  $("#budget-remaining").textContent = formatCurrency(budgetTotal - expenses);
  $("#budget-caption").textContent = `${formatCurrency(expenses)} of ${formatCurrency(budgetTotal)} used`;
  $("#savings-rate").textContent = `${income > 0 ? Math.max(0, Math.round((saved / income) * 100)) : 0}%`;
  $("#chart-total").textContent = formatCurrency(saved);
  $("#current-month").textContent = state.month.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function renderChart() {
  const months = [];
  for (let index = 5; index >= 0; index -= 1) {
    months.push(new Date(state.month.getFullYear(), state.month.getMonth() - index, 1));
  }
  const values = months.map((month) => {
    const transactions = monthTransactions(month);
    return {
      label: month.toLocaleDateString("en-IN", { month: "short" }),
      income: transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0),
      expense: transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0)
    };
  });
  const max = Math.max(1, ...values.flatMap((item) => [item.income, item.expense]));
  const chartWidth = 540;
  const chartHeight = 154;
  const left = 32;
  const top = 7;
  const plotHeight = 112;
  const groupWidth = (chartWidth - left - 8) / values.length;
  const barWidth = 13;
  const grid = [0, 1, 2, 3].map((line) => {
    const y = top + (plotHeight / 3) * line;
    return `<line class="chart-gridline" x1="${left}" y1="${y}" x2="${chartWidth}" y2="${y}"></line>`;
  }).join("");
  const bars = values.map((value, index) => {
    const x = left + index * groupWidth + groupWidth / 2;
    const incomeHeight = value.income / max * plotHeight;
    const expenseHeight = value.expense / max * plotHeight;
    const incomeY = top + plotHeight - incomeHeight;
    const expenseY = top + plotHeight - expenseHeight;
    return `<g class="bar-group">
      <rect class="bar-income" x="${x - barWidth - 1}" y="${incomeY}" width="${barWidth}" height="${Math.max(incomeHeight, 1)}" rx="3"><title>${value.label} income: ${formatCurrency(value.income)}</title></rect>
      <rect class="bar-expense" x="${x + 2}" y="${expenseY}" width="${barWidth}" height="${Math.max(expenseHeight, 1)}" rx="3"><title>${value.label} expenses: ${formatCurrency(value.expense)}</title></rect>
      <text class="chart-label" x="${x}" y="${chartHeight - 9}" text-anchor="middle">${value.label}</text>
    </g>`;
  }).join("");
  $("#cashflow-chart").innerHTML = `<svg class="cashflow-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" aria-hidden="true">${grid}${bars}</svg>`;
}

function renderBudgets() {
  const expenses = monthTransactions(state.month).filter((item) => item.type === "expense");
  $("#budget-list").innerHTML = BUDGETS.map((budget) => {
    const spent = expenses.filter((item) => item.category === budget.name).reduce((sum, item) => sum + item.amount, 0);
    const percentage = Math.round(spent / budget.limit * 100);
    const fill = Math.min(percentage, 100);
    return `<div class="budget-row">
      <span class="category-icon" aria-hidden="true">${budget.icon}</span>
      <div class="category-copy">
        <div class="category-name"><span>${budget.name}</span><small>${formatCurrency(spent)} / ${formatCurrency(budget.limit)}</small></div>
        <div class="progress-track"><div class="progress-fill ${percentage > 100 ? "over-budget" : ""}" style="width:${fill}%"></div></div>
      </div>
      <span class="budget-percent">${percentage}%</span>
    </div>`;
  }).join("");
}

function renderTransactions() {
  const filtered = state.transactions
    .filter((item) => state.filter === "all" || item.type === state.filter)
    .filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(state.search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));
  const visible = state.showAll ? filtered : filtered.slice(0, 5);
  $("#transaction-rows").innerHTML = visible.map((item) => {
    const date = new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const sign = item.type === "income" ? "+" : "−";
    return `<tr>
      <td><span class="transaction-name"><span class="transaction-mark" aria-hidden="true">${CATEGORY_ICONS[item.category] || "•"}</span>${escapeHtml(item.name)}</span></td>
      <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
      <td>${date}</td>
      <td class="amount ${item.type}">${sign}${formatCurrency(item.amount)}</td>
      <td aria-hidden="true">···</td>
    </tr>`;
  }).join("");
  $("#empty-state").hidden = visible.length > 0;
  $("#transaction-count").textContent = `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;
  $("#view-all-button").hidden = filtered.length <= 5;
  $("#view-all-button").innerHTML = state.showAll ? "Show less <span>↑</span>" : "Show all <span>→</span>";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function render() {
  renderSummary();
  renderChart();
  renderBudgets();
  renderTransactions();
}

function updateCategories() {
  const type = $("#transaction-form").elements.type.value;
  const select = $("#category-select");
  select.innerHTML = CATEGORIES[type].map((category) => `<option>${escapeHtml(category)}</option>`).join("");
}

function openDialog() {
  const form = $("#transaction-form");
  form.reset();
  form.elements.date.value = offsetDate(0);
  $("#form-error").textContent = "";
  updateCategories();
  $("#transaction-dialog").showModal();
  form.elements.name.focus();
}

$("#today-label").textContent = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
$("#add-transaction").addEventListener("click", openDialog);
$("#close-dialog").addEventListener("click", () => $("#transaction-dialog").close());
$("#cancel-dialog").addEventListener("click", () => $("#transaction-dialog").close());
$("#transaction-dialog").addEventListener("click", (event) => {
  if (event.target === $("#transaction-dialog")) $("#transaction-dialog").close();
});
$("#transaction-form").elements.type.addEventListener("change", updateCategories);
$("#transaction-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const amount = Number(data.get("amount"));
  const name = String(data.get("name")).trim();
  if (!name || !Number.isFinite(amount) || amount <= 0) {
    $("#form-error").textContent = "Enter a name and an amount greater than zero.";
    return;
  }
  const transaction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    amount,
    type: String(data.get("type")),
    category: String(data.get("category")),
    date: String(data.get("date"))
  };
  state.transactions.push(transaction);
  saveTransactions();
  if ($("#form-error").textContent) return;
  state.month = new Date(`${transaction.date}T00:00:00`);
  state.month.setDate(1);
  state.showAll = false;
  $("#transaction-dialog").close();
  render();
});
$("#transaction-search").addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  renderTransactions();
});
$("#filter-button").addEventListener("click", () => {
  const filters = ["all", "expense", "income"];
  state.filter = filters[(filters.indexOf(state.filter) + 1) % filters.length];
  $("#filter-button").querySelector("span").textContent = state.filter === "all" ? "All" : state.filter === "expense" ? "Expenses" : "Income";
  renderTransactions();
});
$("#view-all-button").addEventListener("click", () => {
  state.showAll = !state.showAll;
  renderTransactions();
});
$("#previous-month").addEventListener("click", () => {
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
  render();
});
$("#next-month").addEventListener("click", () => {
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
  render();
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.remove("active");
      item.removeAttribute("aria-current");
    });
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  });
});

render();
