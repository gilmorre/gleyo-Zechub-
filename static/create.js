const titleInput = document.getElementById('title');
const communitySlug = "{{ community_slug }}";
const descInput = document.getElementById('description');
const previewTitle = document.getElementById('preview-title');
const previewDesc = document.getElementById('preview-description');
const createBtn = document.getElementById('create-module');

titleInput.addEventListener('input', () => {
  previewTitle.textContent = titleInput.value || "Your title here";
});

descInput.addEventListener('input', () => {
  previewDesc.textContent = descInput.value || "Your description here";
});

createBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const title = encodeURIComponent(titleInput.value.trim());
  if (title) {
    window.location.href = `/${communitySlug}/quest?title=${title}`;
  } else {
    alert("Please enter a title first!");
  }
});


