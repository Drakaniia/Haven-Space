/**
 * House Rules Page
 *
 * Handles house rules acknowledgment and download functionality
 */

import { initBoarderAccessControl, showProtectedEmptyState } from './access-control-init.js';

/**
 * Initialize House Rules Page
 */
export async function initHouseRulesPage() {
  // Check access control first
  const accessResult = await initBoarderAccessControl();
  
  if (!accessResult.hasAccess) {
    const houseRulesContainer = document.querySelector('.house-rules-container') || document.querySelector('main');
    if (houseRulesContainer) {
      showProtectedEmptyState(houseRulesContainer, 'houseRules');
    }
    return;
  }
  
  // Acknowledge button handler
  const acknowledgeBtn = document.getElementById('acknowledge-rules-btn');
  if (acknowledgeBtn) {
    acknowledgeBtn.addEventListener('click', async () => {
      // TODO: Integrate with backend API to record acknowledgment
      acknowledgeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Acknowledged
      `;
      acknowledgeBtn.disabled = true;
      acknowledgeBtn.classList.add('acknowledged');
    });
  }

  // Download handbook handler
  const downloadBtn = document.getElementById('download-handbook-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', e => {
      e.preventDefault();
      // TODO: Integrate with backend API to download PDF
      alert('Download functionality will be connected to backend API.');
    });
  }
}
