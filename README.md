# VIEW - Portal de Residentes

A modern residential portal for building management, designed to facilitate communication and services between residents, property owners, and administrators.

## 🏢 Overview

VIEW Portal de Residentes is a comprehensive web application that enables building residents and administrators to manage various aspects of residential life, including:

- Financial statements and common expenses
- Document management
- Amenity reservations
- Incident reporting and tracking
- Administrative approvals (for Super Admins)

## ✨ Features

### For Residents (Owners & Tenants)
- **Dashboard**: Quick overview of expenses, upcoming reservations, and open incidents
- **Financial Management**: View and download financial statements
- **Document Access**: Access to contracts, regulations, and other important documents
- **Amenity Reservations**: Book common areas like barbecue areas, event halls, gym, and pool
- **Incident Reporting**: Report maintenance issues, complaints, or submit suggestions

### For Super Admins
- **User Management**: Approve or reject new user registrations
- **Reservation Approvals**: Manage amenity reservation requests
- **Full Access**: Complete visibility and control over all portal features

### General Features
- **Multi-language Support**: Spanish (default) and English
- **Role-based Access**: Different features available based on user role (Owner, Tenant, Super Admin)
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Clean and intuitive interface using VIEW brand design system

## 🎨 Design System

The application follows the VIEW brand guidelines with a consistent color palette:

- **Primary Orange**: `#FF6B35` - Main brand color
- **Cyan**: `#00D4FF` - Secondary accent color
- **Dark**: `#1A1A1A` - Text and UI elements
- **Light backgrounds** with modern gradients and shadows

Typography uses the **Inter** font family for optimal readability.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Start the development server:
```bash
npm run dev
# or
bun run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🛠️ Technology Stack

- **Frontend Framework**: React 18.3.1
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Routing**: React Router DOM v6
- **Internationalization**: i18next & react-i18next
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query

## 📁 Project Structure

```
src/
├── assets/              # Static assets (logos, images)
├── components/          # Reusable components
│   ├── ui/             # shadcn/ui components
│   ├── Header.tsx      # Main header with navigation
│   ├── Sidebar.tsx     # Role-based sidebar navigation
│   └── NavLink.tsx     # Navigation link component
├── i18n/               # Internationalization
│   ├── config.ts       # i18n configuration
│   └── locales/        # Translation files (es.json, en.json)
├── pages/              # Application pages
│   ├── Login.tsx       # Authentication page
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Finanzas.tsx    # Financial statements
│   ├── Documentos.tsx  # Document management
│   ├── Reservas.tsx    # Amenity reservations
│   ├── Incidencias.tsx # Incident reporting
│   ├── Aprobaciones.tsx # Admin approvals
│   ├── MainLayout.tsx  # Main layout wrapper
│   └── NotFound.tsx    # 404 page
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles and design tokens
```

## 🌐 Available Routes

- `/` - Redirects to login
- `/login` - Login page
- `/dashboard` - Main dashboard (default after login)
- `/finanzas` - Financial statements
- `/documentos` - Document management
- `/reservas` - Amenity reservations
- `/incidencias` - Incident reporting and tracking
- `/aprobaciones` - Administrative approvals (Super Admin only)

## 🔧 Configuration

### Environment Variables

Currently, the application doesn't require environment variables for basic functionality. If you need to add backend integration, create a `.env` file:

```env
VITE_API_URL=your_api_url_here
```

### Customization

#### Colors
Edit `src/index.css` and `tailwind.config.ts` to customize the color scheme.

#### Translations
Add or modify translations in:
- `src/i18n/locales/es.json` (Spanish)
- `src/i18n/locales/en.json` (English)

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Quality

The project uses:
- **ESLint** for code linting
- **TypeScript** for type safety
- **Prettier** (recommended) for code formatting

## 📦 Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready to be deployed to any static hosting service.

## 🚀 Deployment

This project can be deployed to:

- **Vercel**: Connect your GitHub repository
- **Netlify**: Deploy from GitHub or drag-and-drop the `dist` folder
- **GitHub Pages**: Configure in repository settings
- Any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for VIEW. All rights reserved.

## 📞 Support

For support or questions:
- Visit the support page in the application footer
- Contact your building administrator
- Email: support@view.com (example)

## 🎯 Roadmap

Future enhancements may include:
- Real-time notifications
- Payment gateway integration
- Mobile app version
- Advanced analytics for administrators
- Integration with building IoT systems
- Community forum

---

