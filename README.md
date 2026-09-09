# Campus Cart

A lightweight college shopping cart project using React, Express, SQL Server, and Nginx.

## Run with Docker

```bash
docker compose up --build
```

Open `http://localhost:8080`.

The API is available through Nginx at `/api/products` and `/api/orders`.

## Run locally

1. Start SQL Server. The API creates the `CampusCart` database, tables, and demo products on first startup; `database/schema.sql` is also included as a readable manual setup script.
2. Run `npm install` at the project root.
3. Start the API with `npm run dev --workspace server`.
4. Start the client with `npm run dev --workspace client`.

Copy `server/.env.example` to `server/.env` and adjust the SQL Server connection values as needed.
