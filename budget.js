document.addEventListener('DOMContentLoaded', async () => {
  const budgetForm = document.getElementById('budgetForm');
  const expenseForm = document.getElementById('expenseForm');
  const budgetMonth = document.getElementById('budgetMonth');
  const budgetCurrency = document.getElementById('budgetCurrency');
  const monthlyBudget = document.getElementById('monthlyBudget');
  const expenseTitle = document.getElementById('expenseTitle');
  const expenseCategory = document.getElementById('expenseCategory');
  const expenseAmount = document.getElementById('expenseAmount');
  const expenseDate = document.getElementById('expenseDate');
  const budgetStatus = document.getElementById('budgetStatus');
  const budgetTotal = document.getElementById('budgetTotal');
  const expenseTotal = document.getElementById('expenseTotal');
  const remainingTotal = document.getElementById('remainingTotal');
  const expenseChart = document.getElementById('expenseChart');
  const chartMonthLabel = document.getElementById('chartMonthLabel');
  const expenseList = document.getElementById('expenseList');

  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const currentDate = today.toISOString().slice(0, 10);

  let currentUser = null;
  let budget = null;
  let expenses = [];

  budgetMonth.value = currentMonth;
  expenseDate.value = currentDate;
  budgetCurrency.value = localStorage.getItem('levelingUpBudgetCurrency') || 'USD';

  const getCurrency = () => budget?.currency_code || budgetCurrency.value || 'USD';

  const formatMoney = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: getCurrency()
  }).format(amount);

  const escapeHtml = (value) => {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  };

  const showStatus = (message, isError = false) => {
    budgetStatus.textContent = message;
    budgetStatus.classList.toggle('error-message', isError);
    setTimeout(() => {
      budgetStatus.textContent = '';
      budgetStatus.classList.remove('error-message');
    }, 2800);
  };

  const monthStart = () => `${budgetMonth.value}-01`;

  const getStoredBudget = () => {
    try {
      return JSON.parse(localStorage.getItem('levelingUpBudget') || '{"budgets":{},"expenses":[]}');
    } catch (error) {
      localStorage.removeItem('levelingUpBudget');
      return { budgets: {}, expenses: [] };
    }
  };

  const setDefaultExpenseDate = () => {
    expenseDate.value = budgetMonth.value === currentMonth ? currentDate : monthStart();
  };

  const loadLocalData = () => {
    const local = getStoredBudget();
    budget = local.budgets?.[budgetMonth.value] || null;
    expenses = local.expenses?.filter((expense) => expense.month === budgetMonth.value) || [];
    budgetCurrency.value = budget?.currency_code || localStorage.getItem('levelingUpBudgetCurrency') || 'USD';
  };

  const saveLocalData = () => {
    const local = getStoredBudget();
    local.budgets = local.budgets || {};
    local.expenses = local.expenses || [];
    local.budgets[budgetMonth.value] = budget;
    local.expenses = local.expenses.filter((expense) => expense.month !== budgetMonth.value).concat(expenses);
    localStorage.setItem('levelingUpBudget', JSON.stringify(local));
  };

  const loadSupabaseData = async () => {
    try {
      const { data: budgetData, error: budgetError } = await window.supabaseClient
        .from('monthly_budgets')
        .select('id, month_start, amount, currency_code')
        .eq('month_start', monthStart())
        .maybeSingle();

      if (budgetError) throw budgetError;

      budget = budgetData;
      budgetCurrency.value = budget?.currency_code || localStorage.getItem('levelingUpBudgetCurrency') || 'USD';

      const { data: expenseData, error: expenseError } = await window.supabaseClient
        .from('budget_expenses')
        .select('id, title, category, amount, expense_date, created_at')
        .eq('expense_month', monthStart())
        .order('expense_date', { ascending: false });

      if (expenseError) throw expenseError;

      expenses = expenseData || [];
    } catch (error) {
      currentUser = null;
      loadLocalData();
      showStatus(`${error.message}. Budget is saved on this device for now.`, true);
    }
  };

  const renderChart = () => {
    const totals = expenses.reduce((result, expense) => {
      const category = expense.category || 'Other';
      result[category] = (result[category] || 0) + Number(expense.amount || 0);
      return result;
    }, {});

    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const maxAmount = Math.max(...entries.map((entry) => entry[1]), 0);

    chartMonthLabel.textContent = budgetMonth.value;

    if (!entries.length) {
      expenseChart.innerHTML = '<p class="empty-state">Add expenses to see the graph.</p>';
      return;
    }

    expenseChart.innerHTML = entries
      .map(([category, amount]) => {
        const height = maxAmount ? Math.max((amount / maxAmount) * 100, 8) : 8;
        return `
          <div class="expense-bar-item">
            <div class="expense-bar-track">
              <span class="expense-bar" style="height: ${height}%"></span>
            </div>
            <strong>${formatMoney(amount)}</strong>
            <span>${escapeHtml(category)}</span>
          </div>
        `;
      })
      .join('');
  };

  const renderExpenses = () => {
    if (!expenses.length) {
      expenseList.innerHTML = '<p class="empty-state">No expenses yet. Add your first one above.</p>';
      return;
    }

    expenseList.innerHTML = expenses
      .map((expense, index) => `
        <article class="task-item">
          <div>
            <h3>${escapeHtml(expense.title)}</h3>
            <p>${escapeHtml(expense.category || 'Other')} - ${formatMoney(Number(expense.amount || 0))}</p>
            <small>${escapeHtml(expense.expense_date || expense.date || '')}</small>
          </div>
          <button class="task-done expense-delete" data-index="${index}">Delete</button>
        </article>
      `)
      .join('');
  };

  const renderBudget = () => {
    const totalBudget = Number(budget?.amount || 0);
    const spent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const remaining = totalBudget - spent;

    monthlyBudget.value = totalBudget || '';
    budgetTotal.textContent = formatMoney(totalBudget);
    expenseTotal.textContent = formatMoney(spent);
    remainingTotal.textContent = formatMoney(remaining);
    remainingTotal.classList.toggle('error-message', remaining < 0);

    renderChart();
    renderExpenses();
  };

  const refreshData = async () => {
    if (window.supabaseClient && currentUser) {
      await loadSupabaseData();
    } else {
      loadLocalData();
    }
    renderBudget();
  };

  const setupBudget = async () => {
    if (!window.supabaseClient) {
      loadLocalData();
      renderBudget();
      return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();
    currentUser = data?.user || null;

    if (error || !currentUser) {
      loadLocalData();
      renderBudget();
      return;
    }

    await refreshData();
  };

  budgetMonth.addEventListener('change', async () => {
    setDefaultExpenseDate();
    await refreshData();
  });

  budgetForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const amount = Number(monthlyBudget.value);
    if (Number.isNaN(amount) || amount < 0) return;
    localStorage.setItem('levelingUpBudgetCurrency', budgetCurrency.value);

    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient
        .from('monthly_budgets')
        .upsert(
          {
            user_id: currentUser.id,
            month_start: monthStart(),
            amount,
            currency_code: budgetCurrency.value
          },
          { onConflict: 'user_id,month_start' }
        )
        .select('id, month_start, amount, currency_code')
        .single();

      if (error) {
        showStatus(error.message, true);
        return;
      }

      budget = data;
    } else {
      budget = { id: budgetMonth.value, month_start: monthStart(), amount, currency_code: budgetCurrency.value };
      saveLocalData();
    }

    renderBudget();
    showStatus('Budget saved successfully.');
  });

  budgetCurrency.addEventListener('change', () => {
    localStorage.setItem('levelingUpBudgetCurrency', budgetCurrency.value);
    if (budget) {
      budget.currency_code = budgetCurrency.value;
    }
    renderBudget();
  });

  expenseForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const amount = Number(expenseAmount.value);
    const expense = {
      title: expenseTitle.value.trim(),
      category: expenseCategory.value,
      amount,
      expense_date: expenseDate.value,
      expense_month: monthStart()
    };

    if (!expense.title || Number.isNaN(amount) || amount <= 0) return;

    if (window.supabaseClient && currentUser) {
      const { data, error } = await window.supabaseClient
        .from('budget_expenses')
        .insert({ ...expense, user_id: currentUser.id })
        .select('id, title, category, amount, expense_date, created_at')
        .single();

      if (error) {
        showStatus(error.message, true);
        return;
      }

      expenses.unshift(data);
    } else {
      expenses.unshift({
        ...expense,
        id: crypto.randomUUID(),
        month: budgetMonth.value
      });
      saveLocalData();
    }

    expenseForm.reset();
    setDefaultExpenseDate();
    renderBudget();
    showStatus('Expense added successfully.');
  });

  expenseList.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('.expense-delete');
    if (!deleteButton) return;

    const index = Number(deleteButton.dataset.index);
    const expense = expenses[index];

    if (window.supabaseClient && currentUser && expense?.id) {
      const { error } = await window.supabaseClient.from('budget_expenses').delete().eq('id', expense.id);
      if (error) {
        showStatus(error.message, true);
        return;
      }
    }

    expenses.splice(index, 1);
    if (!currentUser) saveLocalData();
    renderBudget();
    showStatus('Expense deleted.');
  });

  await setupBudget();
});
