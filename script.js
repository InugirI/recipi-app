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

let editingIndex = null; // 編集中のレシピ番号
let allRecipes = []; // 全レシピデータを保持
let myIngredients = [];
let currentRecipeIndex = null; // 現在表示中のレシピ番号
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
  editingIndex = null;
  recipeTitle.value = "";
  recipeDescription.value = "";
  recipeIngredients.value = "";
  recipeImage.value = "";
  recipeCategory.value = "未分類"; // Reset category
});

cancelBtn.addEventListener('click', () => {
  addRecipeForm.style.display = 'none';
  addRecipeBtn.style.display = 'inline-block';
  saveRecipeBtn.textContent = "保存";
  editingIndex = null;
  recipeTitle.value = "";
  recipeDescription.value = "";
  recipeIngredients.value = "";
  recipeImage.value = "";
  if (imagePreview) {
    imagePreview.src = '';
    imagePreview.style.display = 'none';
  }
});

// --- レシピ一覧をAPIから取得して表示 ---
function displayRecipes() {
  fetch('http://localhost:3000/api/recipes')
    .then(response => response.json())
    .then(data => {
      allRecipes = data;
      renderRecipeList(filterRecipes(allRecipes));
    })
    .catch(() => showStatus('レシピの取得に失敗しました', true));
}

function loadCategories() {
  fetch('http://localhost:3000/api/categories')
    .then(response => response.json())
    .then(categories => {
      // Populate the dropdown in the form
      recipeCategory.innerHTML = '';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        recipeCategory.appendChild(option);
      });

      // Populate the category list in the sidebar
      const categoryList = document.getElementById('categoryList');
      categoryList.innerHTML = '';
      categories.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat;
        li.dataset.id = cat;
        li.classList.add('category-item'); // Add a class for styling
        categoryList.appendChild(li);
      });

      // Make the list sortable
      new Sortable(categoryList, {
        animation: 150,
        onEnd: function (evt) {
          const newOrder = [...evt.to.children].map(li => li.dataset.id);
          
          // Send the new order to the server
          fetch('http://localhost:3000/api/categories/order', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newOrder })
          })
          .then(res => res.json())
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
  if (!Array.isArray(data)) {
    showStatus('レシピデータの取得に失敗しました。再読み込みしてください。', true);
    console.error("renderRecipeList: data is not an array", data);
    return;
  }
  const recipeList = document.getElementById('recipeList');
  recipeList.innerHTML = "";
  if (data.length === 0) {
    recipeList.innerHTML = "<li style='background:#fff; border-radius:15px; padding:20px; text-align:center; color:#666;'>条件に合うレシピがありません。</li>";
    return;
  }
  data.forEach((recipe, index) => {
    // 材料の比較
    let isRecommended = false;
    if (myIngredients.length > 0 && recipe.ingredients && Array.isArray(recipe.ingredients)) {
      isRecommended = recipe.ingredients.every(ing => myIngredients.includes(ing));
    }
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="category-badge">${recipe.category || '未分類'}</span>
      ${isRecommended ? '<span style="color:#e67e22; font-weight:bold;">★おすすめ</span>' : ''}
      ${recipe.imageUrl ? `<img src="${recipe.imageUrl}" alt="レシピ画像" style="max-width:100px; display:block; margin-bottom:8px;">` : ''}
      <span class="recipeTitle" data-index="${index}" style="cursor:pointer; color:blue; text-decoration:underline;">
        ${recipe.title}
      </span><br>
      <span style="font-size:0.95em; color:#555;">材料: ${(recipe.ingredients || []).join(', ')}</span><br>
      <p>${recipe.description}</p>
      <div class="recipe-actions">
        <button class="likeBtn" data-index="${index}">いいね</button>
        <span class="like-count">${recipe.likes || 0}</span>
        <button class="deleteBtn" data-index="${index}">削除</button>
        <button class="editBtn" data-index="${index}">編集</button>
      </div>
    `;
    recipeList.appendChild(li);
  });

  // --- イベントリスナー ---
  // 削除ボタン
  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = this.getAttribute('data-index');
      fetch('http://localhost:3000/api/recipes/' + idx, {
        method: 'DELETE'
      })
      .then(response => response.json())
      .then(() => {
        showStatus('レシピを削除しました');
        displayRecipes();
      })
      .catch(() => showStatus('削除に失敗しました', true));
    });
  });

  // 詳細表示（タイトルクリック）
  document.querySelectorAll('.recipeTitle').forEach(titleEl => {
    titleEl.addEventListener('click', function() {
      const idx = this.getAttribute('data-index');
      const recipe = data[idx];
      currentRecipeIndex = idx; // 現在のレシピ番号を保存
      
      document.getElementById('detailTitle').textContent = recipe.title;
      document.getElementById('detailDescription').innerHTML =
        (recipe.imageUrl ? `<img src="${recipe.imageUrl}" alt="レシピ画像" style="max-width:200px; display:block; margin-bottom:8px;">` : '') +
        `<br>材料: ${(recipe.ingredients || []).join(', ')}<br>${recipe.description}`;
      
      detailLikeCount.textContent = `${recipe.likes || 0} いいね`;
      document.getElementById('recipeDetail').style.display = 'block';
      
      loadComments(idx);
    });
  });

  // 編集ボタン
  document.querySelectorAll('.editBtn').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = this.getAttribute('data-index');
      const recipe = allRecipes[idx];
      editingIndex = idx;
      recipeTitle.value = recipe.title;
      recipeDescription.value = recipe.description;
      recipeIngredients.value = (recipe.ingredients || []).join(', ');
      recipeCategory.value = recipe.category || '未分類';
      addRecipeForm.style.display = 'block';
      addRecipeBtn.style.display = 'none';
      saveRecipeBtn.textContent = "更新";
    });
  });

  // いいねボタン
  document.querySelectorAll('.likeBtn').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = this.getAttribute('data-index');
      // ここでは単純にいいねを追加するPOSTリクエストのみ実装
      fetch(`http://localhost:3000/api/recipes/${idx}/like`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          showStatus('いいねしました！');
          // UIのいいね数を更新
          this.nextElementSibling.textContent = data.likes;
        })
        .catch(() => showStatus('いいねに失敗しました', true));
    });
  });
}

// --- 新しいレシピ or 編集をAPI経由で追加/更新 ---
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

  saveRecipeBtn.disabled = true;
  const originalText = saveRecipeBtn.textContent;
  saveRecipeBtn.textContent = '保存中...';

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('ingredients', ingredients);
  formData.append('category', category);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const url = (editingIndex !== null) ? `http://localhost:3000/api/recipes/${editingIndex}` : 'http://localhost:3000/api/recipes';
  const method = (editingIndex !== null) ? 'PUT' : 'POST';

  fetch(url, { method, body: formData })
    .then(response => response.json())
    .then(() => {
      showStatus(editingIndex !== null ? 'レシピを更新しました' : 'レシピを追加しました');
      displayRecipes();
      recipeTitle.value = "";
      recipeDescription.value = "";
      recipeIngredients.value = "";
      recipeImage.value = "";
      addRecipeForm.style.display = 'none';
      addRecipeBtn.style.display = 'inline-block';
      editingIndex = null;
    })
    .catch(() => showStatus('保存に失敗しました', true))
    .finally(() => { saveRecipeBtn.disabled = false; saveRecipeBtn.textContent = originalText; });
});

// 画像プレビュー
if (recipeImage && imagePreview) {
  recipeImage.addEventListener('change', () => {
    const file = recipeImage.files && recipeImage.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target && e.target.result ? e.target.result : '';
        imagePreview.style.display = imagePreview.src ? 'block' : 'none';
      };
      reader.readAsDataURL(file);
    } else {
      imagePreview.src = '';
      imagePreview.style.display = 'none';
    }
  });
}

// --- おすすめレシピ表示 ---
suggestBtn.addEventListener('click', () => {
  const input = myIngredientsInput.value.trim();
  if (!input) {
    myIngredients = [];
    displayRecipes(); // 配列を渡さずAPIから取得
    return;
  }
  myIngredients = input.split(',').map(s => s.trim()).filter(s => s);
  displayRecipes(); // 配列を渡さずAPIから取得
});

// --- 検索（デバウンス付き） ---
function debounce(fn, wait) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
const handleSearch = debounce(() => {
  searchQuery = (searchQueryInput.value || '').trim();
  renderRecipeList(filterRecipes(allRecipes));
}, 300);
if (searchQueryInput) {
  searchQueryInput.addEventListener('input', handleSearch);
}

// --- サイドバーの検索モード切替 ---
const searchModeList = document.getElementById('searchModeList');
searchModeList.addEventListener('click', (e) => {
  e.preventDefault();
  const target = e.target;
  if (target.tagName !== 'A') return;

  // Reset current active link
  searchModeList.querySelector('.active').classList.remove('active');
  // Set new active link
  target.classList.add('active');

  searchMode = target.getAttribute('data-mode');
  
  // Re-filter and render the list with the new mode
  renderRecipeList(filterRecipes(allRecipes));
});

// --- コメント機能 ---
// コメント投稿ボタン
document.getElementById('postCommentBtn').addEventListener('click', () => {
  const commentInput = document.getElementById('commentInput');
  const comment = commentInput.value.trim();
  
  if (comment && currentRecipeIndex !== null) {
    fetch('http://localhost:3000/api/recipes/' + currentRecipeIndex + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment })
    })
    .then(response => response.json())
    .then(() => {
      commentInput.value = "";
      loadComments(currentRecipeIndex);
      showStatus('コメントを投稿しました');
    })
    .catch(() => showStatus('コメントの投稿に失敗しました', true));
  } else {
    showStatus('コメントを入力してください', true);
  }
});

detailLikeBtn.addEventListener('click', function() {
    if (currentRecipeIndex === null) return;
    // Here we just POST to add a like. A more complex app might toggle like/unlike.
    fetch(`http://localhost:3000/api/recipes/${currentRecipeIndex}/like`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            showStatus('いいねしました！');
            detailLikeCount.textContent = `${data.likes} いいね`;
            // Also refresh the main list to reflect the new like count there
            displayRecipes();
        })
        .catch(() => showStatus('いいねに失敗しました', true));
});

// コメント一覧を読み込む
function loadComments(recipeIndex) {
  fetch('http://localhost:3000/api/recipes/' + recipeIndex + '/comments')
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
          <div style=\"font-size:0.9em; color:#666;\">${comment.timestamp}</div>
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
});

document.getElementById('closeDetailBtn').addEventListener('click', () => {
  document.getElementById('recipeDetail').style.display = 'none';
});