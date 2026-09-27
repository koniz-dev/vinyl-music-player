let activeDialog = null;

const dialog = document.getElementById('app-dialog');
const title = document.getElementById('app-dialog-title');
const message = document.getElementById('app-dialog-message');
const choices = document.getElementById('app-dialog-choices');
const cancelButton = document.getElementById('app-dialog-cancel');
const confirmButton = document.getElementById('app-dialog-confirm');

function close(value) {
    if (!activeDialog) return;
    const { resolve, trigger } = activeDialog;
    activeDialog = null;
    dialog.hidden = true;
    choices.replaceChildren();
    trigger?.focus();
    resolve(value);
}

function open({ dialogTitle, dialogMessage, confirmLabel = 'Continue', dangerous = false, options = null }) {
    if (activeDialog) close(null);

    title.textContent = dialogTitle;
    message.textContent = dialogMessage;
    confirmButton.textContent = confirmLabel;
    confirmButton.classList.toggle('btn-danger', dangerous);
    choices.hidden = !options;
    choices.replaceChildren();

    if (options) {
        options.forEach((option, index) => {
            const item = document.createElement('label');
            item.className = 'dialog-choice';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'app-dialog-choice';
            input.value = String(index);
            input.checked = index === 0;
            const text = document.createElement('span');
            text.textContent = option;
            item.append(input, text);
            choices.appendChild(item);
        });
    }

    dialog.hidden = false;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return new Promise(resolve => {
        activeDialog = { resolve, trigger, options };
        (options ? choices.querySelector('input') : confirmButton)?.focus();
    });
}

export function confirmDialog(options) {
    return open(options).then(value => Boolean(value?.confirmed));
}

export function selectDialog({ options, ...dialogOptions }) {
    return open({ ...dialogOptions, options }).then(value =>
        value?.confirmed ? options[value.selectedIndex] : null
    );
}

cancelButton.addEventListener('click', () => close(null));
confirmButton.addEventListener('click', () => {
    const selected = choices.querySelector('input:checked');
    close({ confirmed: true, selectedIndex: selected ? Number(selected.value) : 0 });
});
dialog.addEventListener('click', event => {
    if (event.target === dialog) close(null);
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.hidden) {
        event.preventDefault();
        close(null);
    }
});
