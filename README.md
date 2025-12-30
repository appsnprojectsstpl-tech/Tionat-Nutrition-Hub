<<<<<<< HEAD
# Tionat Nutrition Hub - Project Overview

This document provides a comprehensive overview of the Tionat Nutrition Hub application, detailing its features, architecture, and data model.

## 1. Application Summary

Tionat Nutrition Hub is a modern, full-stack e-commerce web application designed for selling nutritional and health-focused products. The application is built using a Next.js frontend, styled with Tailwind CSS and ShadCN UI components, and powered by a Firebase backend for data storage and user authentication.

A key design choice is that the application is built with a **mobile-first, mobile-only** interface. The layout is optimized and enforced to a mobile viewport, ensuring a consistent and streamlined user experience across all devices, including desktops.

## 2. Core Features Implemented

### Storefront Features

- **Dynamic Homepage:** The main landing page (`/`) fetches and displays products directly from Firestore. It features a prominent hero section and a carousel for "New Arrivals".
- **Product Catalog:**
    - **Category Filtering:** Users can filter products by main categories like "Nutritional Care".
    - **Meal Time Filtering:** Within the "Nutritional Care" category, users can further filter products by meal times (e.g., Breakfast, Lunch).
- **Product Detail Pages:** Each product has a dedicated page (`/product/[slug]`) with a detailed description, image gallery, and an "Add to Cart" functionality. Related products are also shown.
- **Shopping Cart (`/cart`):** A fully persistent shopping cart that allows users to add, remove, and update the quantity of items. The cart's state is saved in the browser's local storage.
- **User Authentication (`/login`, `/signup`):**
    - Supports both **email/password** and **Google Sign-In**.
    - New user profiles are automatically created in Firestore on their first successful login, which handles users created directly in the Firebase console.
    - Includes a "Forgot Password" link.
- **User Profile Page (`/profile`):**
    - Displays user's name, email, and avatar.
    - Allows users to **edit their profile information**, including name, phone number, and address.
    - Features a **logout button**.
    - Shows the user's **TioRewards** loyalty status, including their tier (e.g., Gold) and current points balance.
    - Lists the user's **order history**, with each order linking to a detailed view.
- **Order Details Page (`/profile/orders/[orderId]`):** Provides a detailed breakdown of a specific past order, including items purchased, shipping address, and total cost.
- **Checkout Flow:**
    - **Checkout Page (`/checkout`):** A secure page for logged-in users to enter their shipping information and place an order.
    - **Order Confirmation Page (`/order-confirmation`):** A confirmation screen shown to the user after successfully placing an order, displaying their order ID.

### Administrative Features (`/admin`)

- **Unified Mobile View:** The entire admin section uses a bottom navigation bar, making it easy to manage the store from any device.
- **Admin Dashboard (`/admin`):**
    - **Live Statistics:** Displays real-time data for Total Revenue, Total Products, Total Orders, and Total Customers.
    - **Recent Orders Table:** Shows the 5 most recent orders placed in the store for a quick overview.
- **Product Management (`/admin/products`):**
    - **Full CRUD:** Admins can Create, Read, Update, and Delete products.
    - **Inventory Management:** Stock levels for each product can be viewed and updated directly from the product list.
    - **Bulk Stock Updates:** Admins can upload a CSV file with `productName` and `stock` columns to update inventory in bulk.
- **Order Management (`/admin/orders`):** A comprehensive list of all orders placed by all users, sortable by date.
- **User Management:**
    - **Customers Page (`/admin/users`):** Lists all users with the 'user' role, showing their name, email, and loyalty status.
    - **Admins Page (`/admin/admins`):** Lists all users with the 'admin' role, showing their name, email, phone, and address.
- **Loyalty Program Management (`/admin/loyalty`):** A settings page where admins can configure the rules for the TioRewards program, such as points earned per Rupee and tier discounts.
- **Database Seeding (`/admin/seed`):** A utility page that allows for one-click population of the Firestore database with initial product, category, and user data.

## 3. Data Structure (Firestore)

The application's data is structured and stored in **Firebase Firestore**.

- `/categories/{categoryId}`: Stores main product categories (e.g., Nutritional Care).
- `/products/{productId}`: Stores all individual product details.
- `/inventory/{productId}`: Stores the stock level for each product. The document ID matches the product ID.
- `/users/{userId}`: Stores public-facing user profile information, including their role and loyalty status.
- `/users/{userId}/orders/{orderId}`: A subcollection storing the order history for a specific user.
- `/orders/{orderId}`: A top-level collection containing all orders from all users, intended for admin access.
- `/loyaltyProgram/{loyaltyProgramId}`: Stores the configuration rules for the TioRewards loyalty program.
=======
# Tionat-Nutrition-Hub
>>>>>>> 4980f9689a9037db67f51b2be763fe157ea23e9a
