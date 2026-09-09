IF DB_ID('CampusCart') IS NULL
BEGIN
  CREATE DATABASE CampusCart;
END;
GO

USE CampusCart;
GO

IF OBJECT_ID('dbo.Products', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Products (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(120) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    Price DECIMAL(10,2) NOT NULL CHECK (Price >= 0),
    ImageUrl NVARCHAR(500) NOT NULL,
    Inventory INT NOT NULL CHECK (Inventory >= 0),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Orders (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Total DECIMAL(10,2) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.OrderItems (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OrderId INT NOT NULL REFERENCES dbo.Orders(Id),
    ProductId INT NOT NULL REFERENCES dbo.Products(Id),
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(10,2) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Products)
BEGIN
  INSERT INTO dbo.Products (Name, Description, Price, ImageUrl, Inventory)
  VALUES
    ('Canvas Daypack', 'A sturdy everyday backpack for books, laptops, and late study sessions.', 42.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', 14),
    ('Campus Hoodie', 'Soft heavyweight cotton hoodie with a relaxed fit for cool lecture halls.', 36.50, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80', 9),
    ('Ceramic Mug', 'A roomy ceramic mug for coffee, tea, and the first hour of the day.', 16.00, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80', 21),
    ('Notebook Set', 'Three recycled-paper notebooks for ideas, plans, and excellent margins.', 12.75, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80', 35),
    ('Desk Lamp', 'A compact warm-light lamp that makes small desks feel more focused.', 29.99, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', 7),
    ('Steel Bottle', 'Double-wall steel bottle that keeps drinks cold between classes.', 24.00, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80', 18);
END;
GO
