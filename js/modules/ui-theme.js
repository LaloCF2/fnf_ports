window.toggleTheme = () => {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme') || 'dark';
  let nextTheme = 'dark';
  let iconUrl = '';

  if (currentTheme === 'dark') {
    nextTheme = 'light';
    iconUrl = 'https://cdn-icons-png.flaticon.com/128/869/869869.png';
  } else if (currentTheme === 'light') {
    nextTheme = 'oled';
    iconUrl = 'https://cdn-icons-png.flaticon.com/128/6714/6714978.png';
  } else {
    nextTheme = 'dark';
    iconUrl = 'https://cdn-icons-png.flaticon.com/128/1828/1828231.png';
  }

  html.setAttribute('data-theme', nextTheme);
  localStorage.setItem('fnf_theme', nextTheme);

  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.style.transform = 'scale(0)';
    setTimeout(() => {
      icon.src = iconUrl;
      icon.style.transform = 'scale(1)';
    }, 200);
  }

  if (window.triggerVibrate) window.triggerVibrate(15);
};

document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const icon = document.getElementById('theme-icon');
  if (icon) {
    if (currentTheme === 'light') icon.src = 'https://cdn-icons-png.flaticon.com/128/869/869869.png';
    else if (currentTheme === 'oled') icon.src = 'https://cdn-icons-png.flaticon.com/128/6714/6714978.png';
    else icon.src = 'https://cdn-icons-png.flaticon.com/128/1828/1828231.png';
  }
});

window.selectSection = (id, el) => {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  const searchUI = document.getElementById("searchContainer");
  const filterUI = document.getElementById("filterContainer");

  if (id === 'apks') {
    searchUI.style.display = 'block';
    filterUI.style.display = 'none';
  } else if (id === 'mods') {
    searchUI.style.display = 'block';
    filterUI.style.display = 'flex';
  } else if (id === 'scripts') {
    searchUI.style.display = 'block';
    filterUI.style.display = 'none';
  } else {
    searchUI.style.display = 'none';
    filterUI.style.display = 'none';
  }

  if (el) {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    el.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.setFilter = (filter, btn) => {
  window.currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (window.filterContent) {
    window.filterContent();
  }
};
