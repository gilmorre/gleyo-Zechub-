// Turns the native <select> into a searchable dropdown.
// Search box appears INSIDE the dropdown only when it opens.
document.addEventListener('DOMContentLoaded', () => {
  new Choices('#blockchainSelect', {
    searchEnabled: true,
    shouldSort: false,
    placeholderValue: 'Select a blockchain',
    searchPlaceholderValue: 'Type to search…'  // shows inside panel
  });
});
