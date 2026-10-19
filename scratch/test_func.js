    function clearAdminEmails() {
      if (!confirm("Clear all dispatched emails and verification codes from admin inbox?")) return;
      saveLocalInbox([]);
      renderAdminMailbox();
      showToast("Admin mailbox cleared.");
    }

