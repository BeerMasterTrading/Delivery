const regionCode = "040000000";
  const provinceSelect = document.getElementById("province");
  const citySelect = document.getElementById("city");
  const barangaySelect = document.getElementById("barangay");

  async function loadProvinces() {
    try {
      const res = await fetch('https://psgc.gitlab.io/api/provinces.json');
      if (!res.ok) throw new Error('Failed to fetch provinces');
      const provinces = await res.json();

      const filteredProvinces = provinces.filter(p => p.regionCode && p.regionCode.startsWith(regionCode));

      filteredProvinces.sort((a, b) => a.name.localeCompare(b.name));

      provinceSelect.innerHTML = `<option value="">Select a province</option>`;
      filteredProvinces.forEach(province => {
        const option = document.createElement("option");
        option.value = province.code;
        option.textContent = province.name;
        provinceSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading provinces:", error);
    }
  }

  provinceSelect.addEventListener("change", async () => {
    citySelect.innerHTML = `<option value="">Select a city/municipality</option>`;
    barangaySelect.innerHTML = `<option value="">Select a barangay</option>`;
    barangaySelect.disabled = true;

    const provinceCode = provinceSelect.value;
    if (!provinceCode) {
      citySelect.disabled = true;
      return;
    }
    citySelect.disabled = false;

    try {
      const res = await fetch('https://psgc.gitlab.io/api/cities-municipalities.json');
      if (!res.ok) throw new Error('Failed to fetch cities');
      const cities = await res.json();

      const filteredCities = cities.filter(c => c.provinceCode === provinceCode);
      filteredCities.sort((a, b) => a.name.localeCompare(b.name));

      filteredCities.forEach(city => {
        const option = document.createElement("option");
        option.value = city.code;
        option.textContent = city.name;
        citySelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading cities:", error);
    }
  });

  citySelect.addEventListener("change", async () => {
    barangaySelect.innerHTML = `<option value="">Select a barangay</option>`;

    const cityCode = citySelect.value;
    if (!cityCode) {
      barangaySelect.disabled = true;
      return;
    }
    barangaySelect.disabled = false;

    try {
      const res = await fetch('https://psgc.gitlab.io/api/barangays.json');
      if (!res.ok) throw new Error('Failed to fetch barangays');
      const barangays = await res.json();

      const filteredBarangays = barangays.filter(b => b.municipalityCode === cityCode);
      filteredBarangays.sort((a, b) => a.name.localeCompare(b.name));

      filteredBarangays.forEach(barangay => {
        const option = document.createElement("option");
        option.value = barangay.code;
        option.textContent = barangay.name;
        barangaySelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading barangays:", error);
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    loadProvinces();
    citySelect.disabled = true;
    barangaySelect.disabled = true;
  });
