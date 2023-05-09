# Logo Wizard Backend Apps

There are two apps:
- Main API (logo-api) – processes requests, creates tasks for the worker, provides info about logos, other objects and users
- Worker (logo-worker) – performs most ML models inference

The backend directory is organized as follows:
- `app` – backend apps
  - `logo_api` – API code
  - `logo_worker` – Worker code
- `lib` – common libraries
  - `logo_configs` – base app settings and configuration, such as logging
  - `logo_worker_interface` – task params for worker tasks
