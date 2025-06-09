  async function loadProvinces() {
    try {
      const res = await fetch('https://psgc.gitlab.io/api/provinces.json');
      const provinces = await res.json();
      const filtered = provinces.filter(p => p.regionCode && p.regionCode.startsWith(regionCode));

      provinceSelect.innerHTML = `<option value="">Select a province</option>`;
      filtered.sort((a, b) => a.name.localeCompare(b.name)).forEach(province => {
        provinceSelect.innerHTML += `<option value="${province.name}">${province.name}</option>`;
      });
    } catch (err) {
      console.error("Provinces fetch error:", err);
    }
  }

  provinceSelect.addEventListener("change", async () => {
    const provinceCode = provinceSelect.value;
    citySelect.disabled = !provinceCode;
    barangaySelect.disabled = true;
    citySelect.innerHTML = `<option value="">Select a city/municipality</option>`;
    barangaySelect.innerHTML = `<option value="">Select a barangay</option>`;

    if (!provinceCode) return;

    try {
      const res = await fetch('https://psgc.gitlab.io/api/cities-municipalities.json');
      const cities = await res.json();
      const filtered = cities.filter(c => c.provinceCode === provinceCode);
      filtered.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
        citySelect.innerHTML += `<option value="${city.name}">${city.name}</option>`;
      });
    } catch (err) {
      console.error("Cities fetch error:", err);
    }
  });

  citySelect.addEventListener("change", async () => {
    const cityCode = citySelect.value;
    barangaySelect.disabled = !cityCode;
    barangaySelect.innerHTML = `<option value="">Select a barangay</option>`;

    if (!cityCode) return;

    try {
      const res = await fetch('https://psgc.gitlab.io/api/barangays.json');
      const barangays = await res.json();
      const filtered = barangays.filter(b => b.municipalityCode === cityCode);
      filtered.sort((a, b) => a.name.localeCompare(b.name)).forEach(barangay => {
        barangaySelect.innerHTML += `<option value="${barangay.name}">${barangay.name}</option>`;
      });
    } catch (err) {
      console.error("Barangays fetch error:", err);
    }
  });

  window.addEventListener('DOMContentLoaded', loadProvinces);
