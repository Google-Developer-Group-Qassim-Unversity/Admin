document.getElementById('linkForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const link1 = document.getElementById('link1');
    const link2 = document.getElementById('link2');
    const link3 = document.getElementById('link3');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    
    clearErrors();
    
    let isValid = true;
    const links = [link1, link2, link3];
    
    links.forEach((link, index) => {
        if (!isValidURL(link.value)) {
            showError(link, `error${index + 1}`);
            isValid = false;
        }
    });
    
    if (!isValid) return;
    
    const linkData = {
        Main_sheet: link1.value.trim(),
        Contrib_sheet: link2.value.trim(),
        attendance_sheet: link3.value.trim()
    };
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    console.log(JSON.stringify(linkData, null, 2));
    console.log('🔗 Raw link data:', linkData);
    
    successMessage.style.display = 'block';
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Links';
    
    document.getElementById('linkForm').reset();

});

function isValidURL(string) {
    if (string === "") {
        return true;
    }
    try {
        const url = new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function showError(input, errorId) {
    input.classList.add('error');
    document.getElementById(errorId).style.display = 'block';
}

function clearErrors() {
    const inputs = document.querySelectorAll('input[type="url"]');
    const errors = document.querySelectorAll('.error-message');
    
    inputs.forEach(input => input.classList.remove('error'));
    errors.forEach(error => error.style.display = 'none');
}

document.querySelectorAll('input[type="url"]').forEach(input => {
    input.addEventListener('input', function() {
        this.classList.remove('error');
        const errorId = 'error' + (Array.from(document.querySelectorAll('input[type="url"]')).indexOf(this) + 1);
        document.getElementById(errorId).style.display = 'none';
    });
});
