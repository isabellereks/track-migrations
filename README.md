# Track Migrations

A data visualization that makes US immigration data tangible. Each dot on the particle map represents roughly 300 people, animated by month from FY2016 to FY2025. The editorial sections below reframe the numbers around real contributions: taxes paid, industries sustained, GDP growth.

The goal is to show both the scale and the humanity behind immigration data without taking a political position. Sister project to [Track Policy](https://trackpolicy.org), which maps AI and data center legislation.

## Tech stack

- **Next.js 16** + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling
- **d3-geo** + **topojson-client** for the US map projection
- **Canvas API** for particle rendering (two-layer architecture: settled + active)
- Data sourced from **CBP**, **Census ACS**, **USCIS**, and several research institutions
