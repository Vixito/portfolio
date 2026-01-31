# Vixis Portfolio

A modern, full-featured portfolio built with React, TypeScript, Vite, and Deno, deployed on Google Cloud Run.

## 🎯 Dev New Year 2026 Challenge Submission

This portfolio was created as part of the **Build Your Portfolio Challenge** presented by Google AI.

### Contest Blog Posts

Two comprehensive blog posts have been written for the contest submission:

- **[CONTEST_BLOG_POST.md](./CONTEST_BLOG_POST.md)** - English version
- **[CONTEST_BLOG_POST_ES.md](./CONTEST_BLOG_POST_ES.md)** - Spanish version (Versión en Español)

These blog posts detail:
- The complete journey of building this portfolio
- Technical implementation and architecture
- Innovation and creativity highlights
- User experience considerations
- Google Cloud Run deployment process
- Challenges and solutions
- Future enhancements

## 🚀 Features

- **Multi-language Support**: Spanish and English
- **Dynamic Content Management**: Admin panel for easy content updates
- **Interactive Timeline**: Animated career journey
- **Blog Integration**: Fetch posts from external sources
- **Radio Player**: Integrated web radio streaming
- **Responsive Design**: Mobile-first, works on all devices
- **Dark/Light Theme**: Toggle between themes
- **Performance Optimized**: Fast loading with code splitting
- **Secure**: CSP headers, HTTPS, secure authentication

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion, GSAP
- **Backend**: Supabase (BaaS)
- **Server**: Deno
- **Deployment**: Google Cloud Run with Docker
- **CI/CD**: Google Cloud Build

## 📦 Deployment

Deployed on **Google Cloud Run** with the required label for the contest:

```bash
--labels dev-tutorial=devnewyear2026
```

### Build and Deploy

```bash
# Build locally
deno task build

# Deploy to Cloud Run (via Cloud Build)
gcloud builds submit --config cloudbuild.yaml
```

## 🏆 Contest Requirements

✅ **Deployed to Google Cloud Run** with label `dev-tutorial=devnewyear2026`

✅ **Innovation and Creativity**: 
- Interactive timeline component
- Integrated radio player
- Multi-language support
- Custom admin panel
- Unique loading animations

✅ **Technical Implementation**:
- Modern React architecture
- TypeScript for type safety
- Serverless deployment
- CI/CD pipeline
- Performance optimization

✅ **User Experience**:
- Responsive design
- Smooth animations
- Accessibility features
- Intuitive navigation

## 📝 License

Copyright © 2026 Vixis. All rights reserved.

## 👤 Author

**Vixis**
- Website: [vixis.dev](https://vixis.dev)
- Portfolio: Deployed on Google Cloud Run

---

*Built with ❤️ for the Dev New Year 2026 Challenge*
