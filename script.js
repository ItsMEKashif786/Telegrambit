/*
  Personal Budget Manager Script
  ===============================
  This script handles the functionality for the Budget Manager:
  - Light/Dark Theme Toggle
  - Managing Transactions (Add, Edit, Delete) using LocalStorage
  - Rendering Dashboard Summary & Updating Category Breakdown Chart
  - Monthly Analysis Chart with Chart.js
  - Savings Goal Tracker with animated progress bar
*/

/* Utility functions to work with localStorage */
function loadData(key) {
  return JSON.parse(localStorage.getItem(key)) || null;
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* Global Variables */
let transactions = loadData('budgetTransactions') || [];
let savingsGoal = loadData('savingsGoal') || 5000; // Default savings goal if none set
let editingTransactionId = null;

let categoryChart, monthlyChart;

// When document is ready, initialize all event listeners and render UI
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme toggle button
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', toggleTheme);

  // Initialize Transaction Form submission and cancellation
  document.getElementById('submit-transaction').addEventListener('click', handleTransactionSubmit);
  document.getElementById('cancel-edit').addEventListener('click', resetTransactionForm);

  // Set the default date in the transaction form to today
  document.getElementById('transaction-date').valueAsDate = new Date();

  // Initialize Savings Goal Form and set its default value
  document.getElementById('savings-goal-input').value = savingsGoal;
  document.getElementById('set-savings-goal').addEventListener('click', updateSavingsGoal);

  // Render initial UI components
  renderTransactions();
  updateDashboard();
  renderMonthlyChart();

  // Apply previously saved theme if available
  if (loadData('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
});

/* Toggle Light/Dark Mode and persist selection in localStorage */
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  saveData('theme', theme);
}

/* Handle Transaction Submission for adding new or editing existing transaction */
function handleTransactionSubmit() {
  const nameInput = document.getElementById('transaction-name');
  const amountInput = document.getElementById('transaction-amount');
  const typeSelect = document.getElementById('transaction-type');
  const categorySelect = document.getElementById('transaction-category');
  const dateInput = document.getElementById('transaction-date');

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeSelect.value;
  const category = categorySelect.value;
  const date = dateInput.value;

  // Basic validation to ensure required fields are not empty
  if (name === "" || isNaN(amount) || !date) {
    alert("Please fill in all required fields.");
    return;
  }

  if (editingTransactionId) {
    // Update existing transaction
    transactions = transactions.map(trans => {
      if (trans.id === editingTransactionId) {
        return { id: trans.id, name, amount, type, category, date };
      }
      return trans;
    });
    editingTransactionId = null;
    document.getElementById('submit-transaction').textContent = "Add Transaction";
    document.getElementById('cancel-edit').style.display = "none";
  } else {
    // Create new transaction object
    const newTransaction = {
      id: Date.now(),
      name,
      amount,
      type,
      category,
      date
    };
    transactions.push(newTransaction);
  }

  // Save transactions in LocalStorage
  saveData('budgetTransactions', transactions);

  // Clear form and update UI components
  resetTransactionForm();
  renderTransactions();
  updateDashboard();
  renderMonthlyChart();
}

/* Reset the Transaction Form after adding/updating */
function resetTransactionForm() {
  editingTransactionId = null;
  document.getElementById('transaction-id').value = "";
  document.getElementById('transaction-name').value = "";
  document.getElementById('transaction-amount').value = "";
  document.getElementById('transaction-type').value = "income";
  document.getElementById('transaction-category').value = "Food";
  document.getElementById('transaction-date').valueAsDate = new Date();
  document.getElementById('submit-transaction').textContent = "Add Transaction";
  document.getElementById('cancel-edit').style.display = "none";
}

/* Render the list of transactions displayed in the Transactions section */
function renderTransactions() {
  const listDiv = document.getElementById('transaction-list');
  listDiv.innerHTML = "";

  if (transactions.length === 0) {
    listDiv.innerHTML = "<p>No transactions added yet.</p>";
    return;
  }

  // Sort transactions by date (most recent first)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  transactions.forEach(trans => {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('transaction-item');
    itemDiv.innerHTML = `
      <div>
        <strong>${trans.name}</strong> - ${trans.category} <br>
        <small>${trans.date}</small>
      </div>
      <div>
        <span>${trans.type === 'income' ? '+' : '-'}$${trans.amount.toFixed(2)}</span>
        <button onclick="editTransaction(${trans.id})">Edit</button>
        <button class="delete-btn" onclick="deleteTransaction(${trans.id})">Delete</button>
      </div>
    `;
    listDiv.appendChild(itemDiv);
  });
}

/* Load transaction data into the form for editing */
function editTransaction(id) {
  const trans = transactions.find(t => t.id === id);
  if (trans) {
    editingTransactionId = id;
    document.getElementById('transaction-name').value = trans.name;
    document.getElementById('transaction-amount').value = trans.amount;
    document.getElementById('transaction-type').value = trans.type;
    document.getElementById('transaction-category').value = trans.category;
    document.getElementById('transaction-date').value = trans.date;
    document.getElementById('submit-transaction').textContent = "Update Transaction";
    document.getElementById('cancel-edit').style.display = "inline-block";
  }
}

/* Delete a transaction from the list */
function deleteTransaction(id) {
  if (confirm("Are you sure you want to delete this transaction?")) {
    transactions = transactions.filter(t => t.id !== id);
    saveData('budgetTransactions', transactions);
    renderTransactions();
    updateDashboard();
    renderMonthlyChart();
  }
}

/* Update Dashboard Summary and the Category Breakdown Chart */
function updateDashboard() {
  let totalIncome = 0,
      totalExpenses = 0;
  let categoryData = {};

  // Initialize known categories – additional entries will fall into 'Other'
  const categories = ["Food", "Rent", "Travel", "Entertainment", "Other"];
  categories.forEach(cat => (categoryData[cat] = 0));

  transactions.forEach(trans => {
    if (trans.type === "income") {
      totalIncome += trans.amount;
    } else {
      totalExpenses += trans.amount;
      if (categoryData[trans.category] !== undefined) {
        categoryData[trans.category] += trans.amount;
      } else {
        categoryData["Other"] += trans.amount;
      }
    }
  });

  const netSavings = totalIncome - totalExpenses;

  // Update dashboard numbers in the DOM
  document.getElementById('total-income').textContent = `$${totalIncome.toFixed(2)}`;
  document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
  document.getElementById('net-savings').textContent = `$${netSavings.toFixed(2)}`;

  // Update the Savings Progress Bar
  let progressPercentage = Math.min((netSavings / savingsGoal) * 100, 100);
  document.getElementById('savings-progress-fill').style.width = `${progressPercentage}%`;
  document.getElementById('savings-progress-text').textContent = `${progressPercentage.toFixed(0)}%`;

  // Prepare data for the category breakdown chart
  const chartLabels = Object.keys(categoryData);
  const chartValues = Object.values(categoryData);

  // Create or update the Chart.js doughnut chart
  if (categoryChart) {
    categoryChart.data.labels = chartLabels;
    categoryChart.data.datasets[0].data = chartValues;
    categoryChart.update();
  } else {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartValues,
          backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff']
        }]
      },
      options: {
        responsive: true,
        animation: {
          animateScale: true
        }
      }
    });
  }
}

/* Render the Monthly Analysis Chart by grouping transactions by month */
function renderMonthlyChart() {
  let monthlyData = {};

  transactions.forEach(trans => {
    const month = new Date(trans.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expense: 0 };
    }
    if (trans.type === 'income') {
      monthlyData[month].income += trans.amount;
    } else {
      monthlyData[month].expense += trans.amount;
    }
  });

  // Sort months chronologically
  let sortedMonths = Object.keys(monthlyData).sort((a, b) => new Date(a) - new Date(b));
  let incomeData = sortedMonths.map(m => monthlyData[m].income);
  let expenseData = sortedMonths.map(m => monthlyData[m].expense);

  // Create or update the monthly analysis line chart
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (monthlyChart) {
    monthlyChart.data.labels = sortedMonths;
    monthlyChart.data.datasets[0].data = incomeData;
    monthlyChart.data.datasets[1].data = expenseData;
    monthlyChart.update();
  } else {
    monthlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedMonths,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            borderColor: '#28a745',
            backgroundColor: 'rgba(40,167,69,0.1)',
            fill: true
          },
          {
            label: 'Expenses',
            data: expenseData,
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220,53,69,0.1)',
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        animation: {
          duration: 1000
        }
      }
    });
  }
}

/* Update Savings Goal based on user input and persist in LocalStorage */
function updateSavingsGoal() {
  const goalInput = document.getElementById('savings-goal-input');
  let goalValue = parseFloat(goalInput.value);
  if (isNaN(goalValue) || goalValue <= 0) {
    alert("Please enter a valid savings goal.");
    return;
  }
  savingsGoal = goalValue;
  saveData('savingsGoal', savingsGoal);
  updateDashboard();
}
