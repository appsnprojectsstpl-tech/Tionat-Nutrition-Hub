# Refined Features & Improvements for Tionat Customer Panel

## 🎨 UI/UX & Navigation
1.  **Unified Customer Hub**: Consolidate `/profile` into a tabbed layout (Overview | Orders | Addresses | Settings).
2.  **Bottom Sheet Navigation**: Mobile-first slide-up menus for quick actions (Address Edit, Order Details).
3.  **Skeleton Loading**: Polished loading states to prevent layout shift.
4.  **Animated Transitions**: Smooth page transitions using `framer-motion`.
5.  **Dark/Light Mode Toggle**: Manual theme switch in profile settings.
6.  **Compact/Cozy View**: Density setting for product grids (more items vs bigger images).
7.  **Language Selection**: Toggle between English/Hindi (UI strings).
8.  **Sticky Action Buttons**: "Add to Cart" / "Checkout" fixed to bottom on mobile.
9.  **Breadcrumbs**: Enhanced navigation aids for deep pages.
10. **Empty States**: Custom illustrations for empty lists/carts.
11. **Toast Stacking**: Better notification management on mobile.
12. **Touch Targets**: Enhanced padding for all mobile interactive elements.

## 📦 Orders & Tracking
13. **Visual Timeline**: Vertical step-by-step order progress tracker (Order Placed -> Packed -> Shipped -> Delivered).
14. **Order Search**: Filter history by Product Name or Order ID.
15. **Cancel Order**: Self-service cancellation for "Pending" orders.
16. **Invoice Download**: PDF generation for GST invoices.
17. **Item-Level Reviews**: Rate specific products after delivery.
18. **Report Issue**: Structured form to report damaged/missing items from Order Details.
19. **Quick Reorder Widget**: "Buy Again" carousel for frequently purchased items.
20. **Price Drop Alerts**: "Notify me when price drops" toggle.
21. **Back in Stock Alerts**: Automated Email/SMS when out-of-stock items return.

## 💬 Support & Community
22. **Live Chat Widget**: Integration (e.g., Tawk.to/Intercom) for real-time support.
23. **Help Center / FAQ**: Searchable knowledge base for common questions (Returns, Shipping).
24. **My Support Tickets**: Dashboard to view status of reported issues/complaints.
25. **Product Q&A**: "Ask a Question" section on product pages.

## ⚙️ Account & Tech
26. **Profile Completion Meter**: Gamified progress bar for account setup.
27. **Multiple Address Types**: Label addresses (Home/Work) with icons.
28. **Default Address Toggle**: Robust logic for primary delivery location.
29. **Notification Preferences**: Granular toggles (SMS vs Email vs Push).
30. **Device Management**: View and logout of specific active sessions.
31. **Offline Mode**: Cache profile/order data for offline viewing.
32. **Error Boundaries**: Prevent full app crashes on component errors.
33. **App Version Display**: Show build version in settings for support debugging.
34. **PWA Shortcuts**: Long-press app icon actions (Android/iOS).
35. **Image Optimization**: Aggressive use of `next/image` sizing.
36. **Form Shake**: Haptic/Visual feedback on invalid inputs.
37. **SWR/React Query**: Optimized data fetching strategy.
38. **Log Monitor**: Client-side error logging to Firestore.
39. **Accessibility Audit**: Full ARIA label coverage.

## ⚠️ Removed Features (As Requested)
- ❌ All Health/Diet Features
- ❌ Wallet / Credits / Referrals
- ❌ Advanced Shopping (Lists, Shared Cart, Voice, Scanner, Compare, Gift)
- ❌ Security (2FA, Biometrics, Social Login)
