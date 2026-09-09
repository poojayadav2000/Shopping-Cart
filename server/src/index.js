import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sql from 'mssql';

const app = express();
const port = Number(process.env.PORT || 4000);
const databaseName = process.env.DB_NAME || 'CampusCart';
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  database: databaseName,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'CampusCart!2026',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true
  },
  pool: { min: 0, max: 10, idleTimeoutMillis: 30000 }
};
let pool;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function initializeDatabase() {
  const maxAttempts = 12;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      pool = new sql.ConnectionPool(dbConfig);
      const masterPool = await new sql.ConnectionPool({ ...dbConfig, database: 'master' }).connect();
      const safeName = databaseName.replaceAll(']', ']]');
      await masterPool.request().query(`IF DB_ID(N'${databaseName.replaceAll("'", "''")}') IS NULL CREATE DATABASE [${safeName}]`);
      await masterPool.close();
      await pool.connect();
      await pool.request().batch(`
    IF OBJECT_ID('dbo.Products', 'U') IS NULL
    CREATE TABLE dbo.Products (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      Name NVARCHAR(120) NOT NULL,
      Description NVARCHAR(500) NOT NULL,
      Price DECIMAL(10,2) NOT NULL CHECK (Price >= 0),
      ImageUrl NVARCHAR(500) NOT NULL,
      Inventory INT NOT NULL CHECK (Inventory >= 0),
      CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF OBJECT_ID('dbo.Orders', 'U') IS NULL
    CREATE TABLE dbo.Orders (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      Total DECIMAL(10,2) NOT NULL,
      CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
    CREATE TABLE dbo.OrderItems (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      OrderId INT NOT NULL REFERENCES dbo.Orders(Id),
      ProductId INT NOT NULL REFERENCES dbo.Products(Id),
      Quantity INT NOT NULL CHECK (Quantity > 0),
      UnitPrice DECIMAL(10,2) NOT NULL
    );
      `);
      await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM dbo.Products)
    INSERT INTO dbo.Products (Name, Description, Price, ImageUrl, Inventory) VALUES
      ('Canvas Daypack', 'A sturdy everyday backpack for books, laptops, and late study sessions.', 42.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', 14),
      ('Campus Hoodie', 'Soft heavyweight cotton hoodie with a relaxed fit for cool lecture halls.', 36.50, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80', 9),
      ('Ceramic Mug', 'A roomy ceramic mug for coffee, tea, and the first hour of the day.', 16.00, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80', 21),
      ('Notebook Set', 'Three recycled-paper notebooks for ideas, plans, and excellent margins.', 12.75, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80', 35),
      ('Desk Lamp', 'A compact warm-light lamp that makes small desks feel more focused.', 29.99, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', 7),
      ('Steel Bottle', 'Double-wall steel bottle that keeps drinks cold between classes.', 24.00, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80', 18);
      `);
      return;
    } catch (error) {
      if (pool) {
        try { await pool.close(); } catch { }
      }
      if (attempt === maxAttempts) throw error;
      console.log(`SQL Server is not ready yet. Retrying in 5 seconds (${attempt}/${maxAttempts})...`);
      await wait(5000);
    }
  }
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/products', async (_request, response) => {
  try {
    const result = await pool.request().query(`
      SELECT Id AS id, Name AS name, Description AS description,
             Price AS price, ImageUrl AS imageUrl, Inventory AS inventory
      FROM dbo.Products
      ORDER BY Id;
    `);
    response.json(result.recordset);
  } catch (error) {
    console.error(error);
    response.status(503).json({ message: 'Products are temporarily unavailable.' });
  }
});

app.post('/api/products', async (request, response) => {
  const name = String(request.body?.name || '').trim();
  const description = String(request.body?.description || '').trim();
  const imageUrl = String(request.body?.imageUrl || '').trim();
  const price = Number(request.body?.price);
  const inventory = Number(request.body?.inventory);

  if (!name || !description || !imageUrl || !Number.isFinite(price) || price < 0 || !Number.isInteger(inventory) || inventory < 0) {
    return response.status(400).json({ message: 'Enter a name, description, image URL, valid price, and inventory quantity.' });
  }
  if (name.length > 120 || description.length > 500 || imageUrl.length > 500) {
    return response.status(400).json({ message: 'Product details are too long.' });
  }

  try {
    const result = await pool.request()
      .input('name', sql.NVarChar(120), name)
      .input('description', sql.NVarChar(500), description)
      .input('price', sql.Decimal(10, 2), price)
      .input('imageUrl', sql.NVarChar(500), imageUrl)
      .input('inventory', sql.Int, inventory)
      .query(`
        INSERT INTO dbo.Products (Name, Description, Price, ImageUrl, Inventory)
        OUTPUT INSERTED.Id AS id, INSERTED.Name AS name, INSERTED.Description AS description,
               INSERTED.Price AS price, INSERTED.ImageUrl AS imageUrl, INSERTED.Inventory AS inventory
        VALUES (@name, @description, @price, @imageUrl, @inventory);
      `);
    response.status(201).json({ product: result.recordset[0], message: `${name} was added to the collection.` });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: 'Could not add the product.' });
  }
});

app.put('/api/products/:id', async (request, response) => {
  const id = Number(request.params.id);
  const name = String(request.body?.name || '').trim();
  const description = String(request.body?.description || '').trim();
  const imageUrl = String(request.body?.imageUrl || '').trim();
  const price = Number(request.body?.price);
  const inventory = Number(request.body?.inventory);

  if (!Number.isInteger(id) || !name || !description || !imageUrl || !Number.isFinite(price) || price < 0 || !Number.isInteger(inventory) || inventory < 0) {
    return response.status(400).json({ message: 'Enter a name, description, image URL, valid price, and inventory quantity.' });
  }
  if (name.length > 120 || description.length > 500 || imageUrl.length > 500) {
    return response.status(400).json({ message: 'Product details are too long.' });
  }

  try {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(120), name)
      .input('description', sql.NVarChar(500), description)
      .input('price', sql.Decimal(10, 2), price)
      .input('imageUrl', sql.NVarChar(500), imageUrl)
      .input('inventory', sql.Int, inventory)
      .query(`
        UPDATE dbo.Products
        SET Name = @name, Description = @description, Price = @price,
            ImageUrl = @imageUrl, Inventory = @inventory
        OUTPUT INSERTED.Id AS id, INSERTED.Name AS name, INSERTED.Description AS description,
               INSERTED.Price AS price, INSERTED.ImageUrl AS imageUrl, INSERTED.Inventory AS inventory
        WHERE Id = @id;
      `);
    if (result.recordset.length === 0) return response.status(404).json({ message: 'Product not found.' });
    response.json({ product: result.recordset[0], message: `${name} was updated.` });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: 'Could not update the product.' });
  }
});

app.delete('/api/products/:id', async (request, response) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id)) return response.status(400).json({ message: 'Invalid product.' });

  try {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.Products WHERE Id = @id; SELECT @@ROWCOUNT AS deleted;');
    if (result.recordsets[0][0].deleted === 0) return response.status(404).json({ message: 'Product not found.' });
    response.json({ message: 'Product deleted.' });
  } catch (error) {
    if (error.number === 547) return response.status(409).json({ message: 'This product is part of an order and cannot be deleted.' });
    console.error(error);
    response.status(500).json({ message: 'Could not delete the product.' });
  }
});

app.post('/api/orders', async (request, response) => {
  const items = Array.isArray(request.body?.items) ? request.body.items : [];
  const normalizedItems = items
    .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
    .filter((item) => Number.isInteger(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0);

  if (normalizedItems.length === 0) {
    return response.status(400).json({ message: 'Add at least one product before checkout.' });
  }

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const products = [];

    for (const item of normalizedItems) {
      const productResult = await new sql.Request(transaction)
        .input('productId', sql.Int, item.productId)
        .query('SELECT Id, Name, Price, Inventory FROM dbo.Products WITH (UPDLOCK, ROWLOCK) WHERE Id = @productId');
      const product = productResult.recordset[0];

      if (!product) {
        throw Object.assign(new Error('One of the selected products no longer exists.'), { statusCode: 404 });
      }
      if (product.Inventory < item.quantity) {
        throw Object.assign(new Error(`${product.Name} only has ${product.Inventory} left.`), { statusCode: 409 });
      }
      products.push({ ...item, product });
    }

    const total = products.reduce((sum, item) => sum + Number(item.product.Price) * item.quantity, 0);
    const orderResult = await new sql.Request(transaction)
      .input('total', sql.Decimal(10, 2), total)
      .query('INSERT INTO dbo.Orders (Total) OUTPUT INSERTED.Id AS id VALUES (@total)');
    const orderId = orderResult.recordset[0].id;

    for (const item of products) {
      await new sql.Request(transaction)
        .input('orderId', sql.Int, orderId)
        .input('productId', sql.Int, item.productId)
        .input('quantity', sql.Int, item.quantity)
        .input('unitPrice', sql.Decimal(10, 2), item.product.Price)
        .query('INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice) VALUES (@orderId, @productId, @quantity, @unitPrice)');

      await new sql.Request(transaction)
        .input('productId', sql.Int, item.productId)
        .input('quantity', sql.Int, item.quantity)
        .query('UPDATE dbo.Products SET Inventory = Inventory - @quantity WHERE Id = @productId');
    }

    await transaction.commit();
    response.status(201).json({ orderId, total: Number(total.toFixed(2)), message: 'Order placed successfully.' });
  } catch (error) {
    if (transaction._aborted !== true) {
      try { await transaction.rollback(); } catch { }
    }
    console.error(error);
    response.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Checkout failed.' });
  }
});

initializeDatabase()
  .then(() => app.listen(port, () => console.log(`Campus Cart API listening on ${port}`)))
  .catch((error) => {
    console.error('Could not connect to SQL Server.', error.message);
    process.exit(1);
  });
