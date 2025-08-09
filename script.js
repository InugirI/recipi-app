// --- 要素の取得 ---
const addRecipeBtn = document.getElementById('addRecipeBtn');
const addRecipeForm = document.getElementById('addRecipeForm');
const cancelBtn = document.getElementById('cancelBtn');
const saveRecipeBtn = document.getElementById('saveRecipeBtn');
const recipeTitle = document.getElementById('recipeTitle');
const recipeDescription = document.getElementById('recipeDescription');
const recipeImage = document.getElementById('recipeImage');
const imagePreview = document.getElementById('imagePreview');
const recipeIngredients = document.getElementById('recipeIngredients');
const myIngredientsInput = document.getElementById('myIngredients');
const suggestBtn = document.getElementById('suggestBtn');
const statusMsg = document.getElementById('statusMsg');
const searchQueryInput = document.getElementById('searchQuery');
const recipeCategory = document.getElementById('recipeCategory');
const detailLikeBtn = document.getElementById('detailLikeBtn');
const detailLikeCount = document.getElementById('detailLikeCount');
const askGeminiBtn = document.getElementById('askGeminiBtn');
const geminiSuggestionsArea = document.getElementById('geminiSuggestionsArea');
const geminiSuggestionsContent = document.getElementById('geminiSuggestionsContent');

// --- グローバル変数 ---
let editingId = null; // 編集中のレシピID
let allRecipes = []; // 全レシピデータを保持
let myIngredients = [];
let currentRecipeId = null; // 現在表示中のレシピID
let searchQuery = '';
let searchMode = 'all'; // 'all', 'nameDesc', 'ingredients'

function showStatus(message, isError = false) {
  if (!statusMsg) return;
  statusMsg.textContent = message;
  statusMsg.style.display = 'block';
  statusMsg.style.background = isError ? '#fdecea' : '#eef7ee';
  statusMsg.style.color = isError ? '#b71c1c' : '#2e7d32';
  setTimeout(() => { statusMsg.style.display = 'none'; }, 2000);
}

// --- フォームの表示・非表示 ---
addRecipeBtn.addEventListener('click', () => {
  addRecipeForm.style.display = 'block';
  addRecipeBtn.style.display = 'none';
  saveRecipeBtn.textContent = "保存";
  editingId = null;
  recipeTitle.value = "";
  recipeDescription.value = "";
  recipeIngredients.value = "";
  recipeImage.value = "";
  recipeCategory.value = "未分類";
});

cancelBtn.addEventListener('click', () => {
  addRecipeForm.style.display = 'none';
  addRecipeBtn.style.display = 'inline-block';
  saveRecipeBtn.textContent = "保存";
  editingId = null;
  recipeTitle.value = "";
  recipeDescription.value = "";
  recipeIngredients.value = "";
  recipeImage.value = "";
  if (imagePreview) {
    imagePreview.src = '';
    imagePreview.style.display = 'none';
  }
});

// --- データ取得・表示 ---
function displayRecipes() {
  fetch('/api/recipes')
    .then(response => response.json())
    .then(data => {
      allRecipes = data;
      renderRecipeList(filterRecipes(allRecipes));
    })
    .catch(() => showStatus('レシピの取得に失敗しました', true));
}

function loadCategories() {
  fetch('/api/categories')
    .then(response => response.json())
    .then(categories => {
      recipeCategory.innerHTML = '';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        recipeCategory.appendChild(option);
      });

      const categoryList = document.getElementById('categoryList');
      categoryList.innerHTML = '';
      categories.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat;
        li.dataset.id = cat;
        li.classList.add('category-item');
        categoryList.appendChild(li);
      });

      new Sortable(categoryList, {
        animation: 150,
        onEnd: function (evt) {
          const newOrder = [...evt.to.children].map(li => li.dataset.id);
          fetch('/api/categories/order', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newOrder })
          })
          .then(() => showStatus('カテゴリーの順序を更新しました'))
          .catch(() => showStatus('順序の更新に失敗しました', true));
        }
      });
    })
    .catch(() => showStatus('カテゴリーの取得に失敗しました', true));
}

function filterRecipes(recipes) {
  if (!searchQuery) return recipes;
  const q = searchQuery.toLowerCase();
  
  return recipes.filter(r => {
    const title = (r.title || '').toLowerCase();
    const description = (r.description || '').toLowerCase();
    const ingredients = (r.ingredients || []).map(ing => ing.toLowerCase());

    switch (searchMode) {
      case 'nameDesc':
        return title.includes(q) || description.includes(q);
      case 'ingredients':
        return ingredients.some(ing => ing.includes(q));
      case 'all':
      default:
        return title.includes(q) || description.includes(q) || ingredients.some(ing => ing.includes(q));
    }
  });
}

function renderRecipeList(data) {
  const recipeList = document.getElementById('recipeList');
  recipeList.innerHTML = "";
  if (!Array.isArray(data) || data.length === 0) {
    recipeList.innerHTML = "<li style='background:#fff; border-radius:15px; padding:20px; text-align:center; color:#666;'>条件に合うレシピがありません。</li>";
    return;
  }
  data.forEach(recipe => {
    const li = document.createElement('li');
    li.dataset.id = recipe.id; // Use database ID
    li.innerHTML = `
      <span class="category-badge">${recipe.category || '未分類'}</span>
      ${recipe.imageUrl ? `<img src="${recipe.imageUrl}" alt="レシピ画像" style="max-width:100px; display:block; margin-bottom:8px;">` : ''}
      <span class="recipeTitle">${recipe.title}</span><br>
      <span style="font-size:0.95em; color:#555;">材料: ${(recipe.ingredients || []).join(', ')}</span><br>
      <p>${recipe.description}</p>
      <div class="recipe-actions">
        <button class="likeBtn">いいね</button>
        <span class="like-count">${recipe.likes || 0}</span>
        <button class="deleteBtn">削除</button>
        <button class="editBtn">編集</button>
      </div>
    `;
    recipeList.appendChild(li);
  });
}

// --- イベントリスナー ---
function setupEventListeners() {
  const recipeList = document.getElementById('recipeList');
  recipeList.addEventListener('click', e => {
    const target = e.target;
    const li = target.closest('li[data-id]');
    if (!li) return;

    const id = li.dataset.id;
    const recipe = allRecipes.find(r => r.id == id);
    if (!recipe) return;

    if (target.classList.contains('deleteBtn')) {
      fetch(`/api/recipes/${id}`, { method: 'DELETE' })
        .then(() => {
          showStatus('レシピを削除しました');
          displayRecipes();
        })
        .catch(() => showStatus('削除に失敗しました', true));
    } else if (target.classList.contains('editBtn')) {
      editingId = id;
      recipeTitle.value = recipe.title;
      recipeDescription.value = recipe.description;
      recipeIngredients.value = (recipe.ingredients || []).join(', ');
      recipeCategory.value = recipe.category || '未分類';
      addRecipeForm.style.display = 'block';
      addRecipeBtn.style.display = 'none';
      saveRecipeBtn.textContent = "更新";
    } else if (target.classList.contains('recipeTitle')) {
      currentRecipeId = id;
      document.getElementById('detailTitle').textContent = recipe.title;
      document.getElementById('detailDescription').innerHTML = 
        (recipe.imageUrl ? `<img src="${recipe.imageUrl}" alt="レシピ画像" style="max-width:200px; display:block; margin-bottom:8px;">` : '') +
        `<br>材料: ${(recipe.ingredients || []).join(', ')}<br>${recipe.description}`;
      detailLikeCount.textContent = `${recipe.likes || 0} いいね`;
      document.getElementById('recipeDetail').style.display = 'block';
      loadComments(id);
    } else if (target.classList.contains('likeBtn')) {
      fetch(`/api/recipes/${id}/like`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          showStatus('いいねしました！');
          target.nextElementSibling.textContent = data.likes;
        })
        .catch(() => showStatus('いいねに失敗しました', true));
    }
  });

  saveRecipeBtn.addEventListener('click', () => {
    const title = recipeTitle.value.trim();
    const description = recipeDescription.value.trim();
    const ingredients = (recipeIngredients.value || '').trim();
    const category = recipeCategory.value;
    const imageFile = recipeImage.files[0];

    if (!title || !description) {
      showStatus('タイトルと説明は必須です', true);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('ingredients', ingredients);
    formData.append('category', category);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const url = editingId ? `/api/recipes/${editingId}` : '/api/recipes';
    const method = editingId ? 'PUT' : 'POST';

    fetch(url, { method, body: formData })
      .then(() => {
        showStatus(editingId ? 'レシピを更新しました' : 'レシピを追加しました');
        addRecipeForm.style.display = 'none';
        addRecipeBtn.style.display = 'inline-block';
        editingId = null;
        displayRecipes();
      })
      .catch(() => showStatus('保存に失敗しました', true));
  });

  detailLikeBtn.addEventListener('click', () => {
    if (currentRecipeId === null) return;
    fetch(`/api/recipes/${currentRecipeId}/like`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        showStatus('いいねしました！');
        detailLikeCount.textContent = `${data.likes} いいね`;
        displayRecipes();
      })
      .catch(() => showStatus('いいねに失敗しました', true));
  });

  askGeminiBtn.addEventListener('click', async () => {
    if (currentRecipeId === null) {
      showStatus('レシピが選択されていません。', true);
      return;
    }

    const selectedRecipe = allRecipes.find(r => r.id == currentRecipeId);
    if (!selectedRecipe) {
      showStatus('選択されたレシピが見つかりません。', true);
      return;
    }

    askGeminiBtn.disabled = true;
    showStatus('おすすめの組み合わせを生成中...', false);
    geminiSuggestionsArea.style.display = 'none'; // Hide previous suggestions
    geminiSuggestionsContent.innerHTML = ''; // Clear previous suggestions

    try {
      const recipeListText = allRecipes.map(r => `- ${r.title} (カテゴリー: ${r.category || '未分類'})`).join('\n');

      const prompt = `## 指示\n選択中となっているレシピが主食・主菜・副菜・汁物・デザートのいずれかを判定し、選択中のもの以外に合うレシピをレシピリストから提示してください。\n例）選択中のレシピ：チャーハンの場合\nカテゴリー：主食\n主菜：XXXX // レシピリストから選択（レシピリストに合うものがないときは該当なしと表示）\n副菜：XXXX // レシピリストから選択（レシピリストに合うものがないときは該当なしと表示）\n汁物：XXXX\nデザート：XXXX\n\n## 選択中\n${selectedRecipe.title}\n\n## レシピリスト\n${recipeListText}`;

      const response = await fetch('/api/gemini-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const geminiText = data.suggestion;

      // Parse Gemini's response
      const categories = ['主食', '主菜', '副菜', '汁物', 'デザート'];
      const suggestions = {};
      let currentCategory = '';

      geminiText.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('カテゴリー：')) {
          // Ignore the category of the selected recipe
        } else {
          const parts = trimmedLine.split('：');
          if (parts.length >= 2) {
            const category = parts[0].trim();
            const recipeName = parts.slice(1).join('：').trim().replace(/\s*\/\/.*$/, ''); // Remove comments
            if (categories.includes(category)) {
              suggestions[category] = recipeName;
            }
          }
        }
      });

      // Display suggestions
      categories.forEach(cat => {
        const card = document.createElement('div');
        card.classList.add('suggestion-card');
        card.innerHTML = `<h3>${cat}</h3><p>${suggestions[cat] || '該当なし'}</p>`;
        geminiSuggestionsContent.appendChild(card);
      });

      geminiSuggestionsArea.style.display = 'block';
      showStatus('おすすめの組み合わせを生成しました！');

    } catch (error) {
      console.error('Gemini API Error:', error);
      showStatus('おすすめの組み合わせの生成に失敗しました。', true);
    } finally {
      askGeminiBtn.disabled = false;
    }
  });

  document.getElementById('postCommentBtn').addEventListener('click', () => {
    const commentInput = document.getElementById('commentInput');
    const comment = commentInput.value.trim();
    if (comment && currentRecipeId !== null) {
      fetch(`/api/comments?recipeId=${currentRecipeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      })
      .then(() => {
        commentInput.value = "";
        loadComments(currentRecipeId);
        showStatus('コメントを投稿しました');
      })
      .catch(() => showStatus('コメントの投稿に失敗しました', true));
    } else {
      showStatus('コメントを入力してください', true);
    }
  });

  const searchModeList = document.getElementById('searchModeList');
  searchModeList.addEventListener('click', (e) => {
    e.preventDefault();
    const target = e.target;
    if (target.tagName !== 'A') return;
    searchModeList.querySelector('.active').classList.remove('active');
    target.classList.add('active');
    searchMode = target.getAttribute('data-mode');
    renderRecipeList(filterRecipes(allRecipes));
  });

  const handleSearch = debounce(() => {
    searchQuery = (searchQueryInput.value || '').trim();
    renderRecipeList(filterRecipes(allRecipes));
  }, 300);
  searchQueryInput.addEventListener('input', handleSearch);
}

// --- その他 ---
function debounce(fn, wait) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function loadComments(recipeId) {
  fetch(`/api/comments?recipeId=${recipeId}`)
    .then(response => response.json())
    .then(comments => {
      const commentsList = document.getElementById('commentsList');
      commentsList.innerHTML = "";
      if (comments.length === 0) {
        commentsList.innerHTML = "<p style='color:#999;'>まだコメントがありません。</p>";
        return;
      }
      comments.forEach(comment => {
        const div = document.createElement('div');
        div.style.borderBottom = '1px solid #eee';
        div.style.padding = '8px 0';
        div.innerHTML = `
          <div style="font-size:0.9em; color:#666;">${comment.timestamp}</div>
          <div>${comment.comment}</div>
        `;
        commentsList.appendChild(div);
      });
    });
}

// --- ページ読み込み時 ---
window.addEventListener('DOMContentLoaded', () => {
  displayRecipes();
  loadCategories();
  setupEventListeners();
});

document.getElementById('closeDetailBtn').addEventListener('click', () => {
  document.getElementById('recipeDetail').style.display = 'none';
});
