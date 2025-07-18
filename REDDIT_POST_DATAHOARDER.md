# Gitea Mirror v3.0 Released - Automatically backup your GitHub repos to self-hosted Gitea with enterprise auth support

Hey fellow data hoarders! 

I've just released v3.0 of Gitea Mirror, my open-source tool that automatically mirrors your GitHub repositories (including private repos, starred repos, and entire organizations) to your self-hosted Gitea instance. Perfect for those of us who like to keep local backups of everything!

## What's New in v3.0

**🔐 Enhanced Security**
- All GitHub/Gitea tokens are now encrypted at rest (AES-256-GCM)
- Migrated to session-based authentication for better security
- Automatic token encryption during upgrade

**🏢 Enterprise Authentication** (for those running this in homelab/work environments)
- SSO/OIDC support (Google, Azure AD, Authentik, etc.)
- Header authentication for reverse proxy setups
- Can even act as an OAuth provider for other services

**📦 Still Dead Simple to Deploy**
```bash
# One command to start
docker compose -f docker-compose.alt.yml up -d
```

## Why This Matters for Data Hoarders

1. **Automatic Backups**: Set it and forget it - automatically mirrors all your repos on a schedule
2. **Preserve Everything**: Mirrors issues, wikis, and all repository metadata
3. **Organization Support**: Mirror entire GitHub organizations with one click
4. **Starred Repos**: Automatically backup repos you've starred (never lose that useful project again!)
5. **Self-Hosted**: Everything runs on your hardware, under your control

## Key Features for Hoarders

- **Multiple Mirror Strategies**: 
  - Preserve GitHub structure
  - Consolidate everything to one org
  - Flat structure under your user
  
- **Smart Filtering**:
  - Include/exclude patterns
  - Fork handling options
  - Archive preservation

- **Batch Operations**: Mirror hundreds of repos efficiently

## Quick Start

```bash
# Using Docker (recommended)
git clone https://github.com/RayLabsHQ/gitea-mirror.git
cd gitea-mirror
docker compose -f docker-compose.alt.yml up -d

# Access at http://localhost:4321
```

First user becomes admin. Just add your GitHub token and Gitea URL, and it starts mirroring!

## Real Use Cases

- Backup your entire GitHub presence (personal + org repos)
- Archive repos before they disappear
- Keep local copies of dependencies
- Mirror starred repos automatically
- Create an offline-accessible code archive

## Links

- **GitHub**: https://github.com/RayLabsHQ/gitea-mirror
- **Docker Image**: `ghcr.io/raylabshq/gitea-mirror:v3.0.0`
- **Docs**: Full setup guide and examples in the README

## Technical Details

- Built with: Bun, Astro, React, SQLite
- Multi-arch Docker support (amd64/arm64)
- Lightweight - runs fine on a Raspberry Pi
- Optional Proxmox LXC deployment script

Would love to hear how you're using it or any feature requests! Perfect companion to your Gitea instance for those who want to ensure their code never disappears.

Happy hoarding! 🗄️

---

*Edit: Thanks for the awards! For those asking about resource usage - it's very lightweight. I run it on a Pi 4 with 2GB RAM allocated and it handles mirroring 500+ repos without issues. The SQLite database stays small even with thousands of repos.*