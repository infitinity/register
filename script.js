/*
    Shared Logic: Registration, Admin, LocalStorage, Session
    MODIFIED: Using simple <select> for country codes
*/

// --- CONFIGURATION ---
const ADMIN_PASSWORD = 'Kk200121@';
const STORAGE_KEY = 'userRegistrations';
const SESSION_KEY = 'adminSession';
const LAST_ACTIVITY_KEY = 'lastActivity';
const RECORDS_PER_PAGE = 80;
const AUTO_LOGOUT_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

// --- GLOBAL VARIABLES (Admin) ---
let currentPage = 1;
let filteredRecords = [];

// --- CUSTOM COUNTRY CODE DATA (Simplified List) ---
const countryCodes = [
    { country: "United States", code: "1" },
    { country: "Canada", code: "1" },
    { country: "United Kingdom", code: "44" },
    { country: "India", code: "91" },
    { country: "Australia", code: "61" },
    { country: "Germany", code: "49" },
    { country: "France", code: "33" },
    { country: "Japan", code: "81" },
    { country: "China", code: "86" },
    { country: "Brazil", code: "55" },
    { country: "South Africa", code: "27" },
    { country: "Sri Lanka", code: "94" },
    // Add more countries as needed for "all world countries"
    // For a full list, you would embed a larger JSON file here or load it.
    // Full list example (for robustness):
    { country: "Afghanistan", code: "93" }, { country: "Albania", code: "355" }, { country: "Algeria", code: "213" },
    { country: "Andorra", code: "376" }, { country: "Angola", code: "244" }, { country: "Argentina", code: "54" },
    { country: "Austria", code: "43" }, { country: "Bangladesh", code: "880" }, { country: "Belgium", code: "32" },
    { country: "Chile", code: "56" }, { country: "Colombia", code: "57" }, { country: "Egypt", code: "20" },
    { country: "Greece", code: "30" }, { country: "Indonesia", code: "62" }, { country: "Italy", code: "39" },
    { country: "Mexico", code: "52" }, { country: "Nigeria", code: "234" }, { country: "Russia", code: "7" },
    { country: "Spain", code: "34" }, { country: "Thailand", code: "66" }, { country: "Turkey", code: "90" },
    // ... add all 200+ countries here for a complete "all world countries" implementation.
];

// --- UTILITY FUNCTIONS ---

/**
 * Loads data from localStorage.
 * @returns {Array} Array of user objects.
 */
function loadRegistrations() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error("Error loading data from localStorage:", e);
        return [];
    }
}

/**
 * Saves the user data array to localStorage.
 * @param {Array} registrations Array of user objects.
 */
function saveRegistrations(registrations) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
    }
}

/**
 * Generates a unique list of country codes from registered users.
 * @param {Array} registrations
 * @returns {Set<string>}
 */
function getUniqueCountryCodes(registrations) {
    const codes = new Set();
    registrations.forEach(user => {
        if (user.countryCode) {
            codes.add(user.countryCode);
        }
    });
    return codes;
}

/**
 * Converts data array to CSV format.
 * @param {Array} data
 * @returns {string} CSV string.
 */
function convertToCSV(data) {
    if (!data.length) return '';

    const header = [
        "Registration Date/Time", "Name", "Phone Number", "Email", "City", "Country Code"
    ].join(',');

    const rows = data.map(row => {
        return [
            `"${row.datetime}"`,
            `"${row.name.replace(/"/g, '""')}"`,
            `"${row.phone.replace(/"/g, '""')}"`,
            `"${row.email.replace(/"/g, '""')}"`,
            `"${row.city.replace(/"/g, '""')}"`,
            `"${row.countryCode.replace(/"/g, '""')}"`
        ].join(',');
    });

    return header + '\n' + rows.join('\n');
}

/**
 * Triggers a download of a string as a CSV file.
 * @param {string} csvString
 * @param {string} filename
 */
function downloadCSV(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- VALIDATION FUNCTIONS (Shared) ---

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// --- REGISTER.HTML LOGIC ---

if (document.getElementById('registrationForm')) {
    const form = document.getElementById('registrationForm');
    const countryCodeSelect = document.getElementById('countryCode');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const cityInput = document.getElementById('city');
    const formMessage = document.getElementById('form-message');

    /**
     * Populates the country code dropdown.
     */
    function populateCountryCodes() {
        // Sort the list alphabetically by country name
        countryCodes.sort((a, b) => a.country.localeCompare(b.country));

        countryCodes.forEach(item => {
            const option = document.createElement('option');
            // Display country name and code in the dropdown
            option.textContent = `${item.country} (+${item.code})`;
            option.value = item.code;
            countryCodeSelect.appendChild(option);
        });

        // Set a sensible default (e.g., India or US)
        countryCodeSelect.value = '91'; // Default to India, change as needed
    }

    populateCountryCodes();

    /**
     * Performs client-side form validation.
     * @returns {boolean} True if form is valid.
     */
    function validateForm() {
        let isValid = true;

        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        formMessage.textContent = '';
        formMessage.className = 'success-message';

        // 1. Name Check
        if (nameInput.value.trim() === '') {
            document.getElementById('name-error').textContent = 'Name is required.';
            isValid = false;
        }

        // 2. Phone Number Check
        const phoneValue = phoneNumberInput.value.trim();
        if (phoneValue === '' || !/^\d+$/.test(phoneValue)) {
            document.getElementById('phone-error').textContent = 'A valid phone number (digits only) is required.';
            isValid = false;
        }
        
        // 3. Email Check
        if (!validateEmail(emailInput.value.trim())) {
            document.getElementById('email-error').textContent = 'A valid email address is required.';
            isValid = false;
        }

        // 4. City Check
        if (cityInput.value.trim() === '') {
            document.getElementById('city-error').textContent = 'City is required.';
            isValid = false;
        }

        return isValid;
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateForm()) {
            const registrations = loadRegistrations();
            const now = new Date();
            const selectedCode = countryCodeSelect.value;
            const phoneNumber = phoneNumberInput.value.trim();

            const newUser = {
                datetime: now.toISOString(),
                name: nameInput.value.trim(),
                phone: phoneNumber,
                email: emailInput.value.trim(),
                city: cityInput.value.trim(),
                countryCode: selectedCode,
                // No flag code in this simple implementation
            };

            registrations.push(newUser);
            saveRegistrations(registrations);

            // Success message and form reset
            formMessage.textContent = 'Registration successful!';
            formMessage.className = 'success-message';
            form.reset();
            // Optionally reset the country code selector to a default
            countryCodeSelect.value = '91';
        } else {
            formMessage.textContent = 'Please correct the errors above.';
            formMessage.className = 'error-message';
        }
    });
}

// --- ADMIN.HTML LOGIC ---

if (document.getElementById('adminLoginForm')) {
    const loginModal = document.getElementById('adminLoginModal');
    const dashboardContent = document.getElementById('dashboardContent');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminPasswordInput = document.getElementById('adminPassword');
    const loginError = document.getElementById('login-error');
    const countryCodeFilter = document.getElementById('countryCodeFilter');
    const applyFiltersButton = document.getElementById('applyFilters');
    const exportCsvButton = document.getElementById('exportCsv');
    const logoutButton = document.getElementById('logoutButton');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfoSpan = document.getElementById('pageInfo');

    // --- SESSION AND LOGOUT ---

    function startSession() {
        localStorage.setItem(SESSION_KEY, 'true');
        updateActivity();
        loginModal.classList.add('hidden');
        dashboardContent.classList.remove('hidden');
        initializeAdminDashboard();
        startInactivityTimer();
    }

    function endSession() {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        if (window.inactivityTimer) {
            clearTimeout(window.inactivityTimer);
        }
        alert("You have been logged out due to inactivity or manually.");
        loginModal.classList.remove('hidden');
        dashboardContent.classList.add('hidden');
        adminLoginForm.reset();
    }

    function updateActivity() {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now());
        if (localStorage.getItem(SESSION_KEY) === 'true') {
            startInactivityTimer();
        }
    }

    function checkInactivity() {
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivity) return;

        const now = Date.now();
        if (now - lastActivity > AUTO_LOGOUT_TIME) {
            endSession();
        } else {
            startInactivityTimer();
        }
    }

    function startInactivityTimer() {
        if (window.inactivityTimer) {
            clearTimeout(window.inactivityTimer);
        }
        window.inactivityTimer = setTimeout(checkInactivity, 60000); // Check every minute
    }

    ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
        document.addEventListener(eventType, updateActivity, true);
    });

    // --- LOGIN HANDLER ---

    adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        loginError.textContent = '';
        if (adminPasswordInput.value === ADMIN_PASSWORD) {
            startSession();
        } else {
            loginError.textContent = 'Invalid password.';
        }
    });

    logoutButton.addEventListener('click', endSession);

    // --- DASHBOARD LOGIC (Filtering, Rendering, Pagination) ---

    function filterRecords() {
        const registrations = loadRegistrations();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const countryCode = countryCodeFilter.value;

        let results = registrations.filter(user => {
            const userDate = new Date(user.datetime);
            let dateMatch = true;

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                dateMatch = dateMatch && userDate >= start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateMatch = dateMatch && userDate <= end;
            }
            return dateMatch;
        });

        if (countryCode) {
            results = results.filter(user => user.countryCode === countryCode);
        }

        results.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

        filteredRecords = results;
        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = '';
        const totalRecords = filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / RECORDS_PER_PAGE);

        const start = (currentPage - 1) * RECORDS_PER_PAGE;
        const end = Math.min(start + RECORDS_PER_PAGE, totalRecords);

        const recordsToShow = filteredRecords.slice(start, end);

        if (recordsToShow.length === 0 && totalRecords > 0) {
            currentPage = totalPages;
            renderTable();
            return;
        }

        if (recordsToShow.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No registered users found.</td></tr>';
        } else {
            recordsToShow.forEach(user => {
                const row = tableBody.insertRow();
                const displayDate = new Date(user.datetime).toLocaleString();

                row.insertCell().textContent = displayDate;
                row.insertCell().textContent = user.name;
                // Display phone number as code + number
                row.insertCell().textContent = `(+${user.countryCode}) ${user.phone}`;
                row.insertCell().textContent = user.email;
                row.insertCell().textContent = user.city;
            });
        }

        // Update Pagination Controls
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
        pageInfoSpan.textContent = `Page ${totalPages > 0 ? currentPage : 0} of ${totalPages}`;
    }

    function populateCountryFilter(registrations) {
        const uniqueCodes = getUniqueCountryCodes(registrations);
        countryCodeFilter.innerHTML = '<option value="">All Countries</option>';

        const sortedCodes = Array.from(uniqueCodes).sort();
        sortedCodes.forEach(code => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `+${code}`;
            countryCodeFilter.appendChild(option);
        });
    }

    // --- EVENT LISTENERS ---

    applyFiltersButton.addEventListener('click', filterRecords);

    exportCsvButton.addEventListener('click', function() {
        if (filteredRecords.length === 0) {
            alert("No records to export. Apply filters first.");
            return;
        }
        const csv = convertToCSV(filteredRecords);
        downloadCSV(csv, 'user_registrations_export.csv');
    });

    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            updateActivity();
        }
    });

    nextPageButton.addEventListener('click', () => {
        if (currentPage * RECORDS_PER_PAGE < filteredRecords.length) {
            currentPage++;
            renderTable();
            updateActivity();
        }
    });

    // --- INITIALIZATION ---

    function initializeAdminDashboard() {
        const allRegistrations = loadRegistrations();
        populateCountryFilter(allRegistrations);
        filterRecords();
    }

    // Check for existing session on page load
    if (localStorage.getItem(SESSION_KEY) === 'true') {
        checkInactivity();
        if (localStorage.getItem(SESSION_KEY) === 'true') {
            startSession();
        } else {
            loginModal.classList.remove('hidden');
        }
    } else {
        loginModal.classList.remove('hidden');
    }
}