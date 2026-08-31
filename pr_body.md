This pull request fixes several bugs and adds requested enhancements across GrinBid and Outbid OS:

1. **GrinBid Modal & Admin Fixes**:
   - Fixed modal close handler (`closeModal`) and added explicit **Cancel** buttons and Escape key support to pop-up screens (login/signup, boost, and claim modals).
   - Fixed admin login password evaluation so environment variable updates (`ADMIN_PASSWORD`) apply immediately and robustly.
   - Verified duplicate username blocking (`username_taken`).

2. **New Admin Features**:
   - Added a new **👥 Registered Users** screen in the Admin Dashboard (`#/admin`) allowing administrators to view all registered users, their stats, and instantly award bonus coins (`+1,000` coins).

3. **Outbid OS Tool Fallbacks**:
   - Embedded offline/fallback data across Outbid OS tool pages (`compare.html`, `idea-picker.html`, `mvp-builder.html`, `search.html`) so compare, simulation, and picker pages work instantly even without a running web server or when opened directly from disk.
