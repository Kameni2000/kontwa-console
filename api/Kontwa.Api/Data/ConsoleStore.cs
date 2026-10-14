using Kontwa.Api.Domain;

namespace Kontwa.Api.Data;

/// <summary>
/// Stockage en mémoire, protégé par un verrou (les requêtes HTTP arrivent en parallèle).
/// Une vraie version utiliserait une base de données derrière la même interface.
/// </summary>
public interface IConsoleStore
{
    IReadOnlyList<Order> ListOrders(OrderStatus? status = null, string? query = null);
    Order GetOrder(string id);
    Order ChangeStatus(string id, OrderStatus status, DateTimeOffset now);
    Order AddRandomOrder(DateTimeOffset now);
    IReadOnlyList<Product> ListProducts();
    Product CreateProduct(ProductInput input);
    Product UpdateProduct(string id, ProductInput input);
    void DeleteProduct(string id);
}

public sealed class InMemoryConsoleStore : IConsoleStore
{
    private readonly object _lock = new();
    private readonly List<Order> _orders;
    private readonly List<Product> _products;
    private readonly Random _random;
    private int _nextOrder;
    private int _nextProduct;

    public InMemoryConsoleStore(DateTimeOffset now, int seed = 2026)
    {
        _random = new Random(seed);
        _products = DemoData.Products.ToList();
        _orders = DemoData.GenerateOrders(now, _random, _products);
        _nextOrder = _orders.Select(o => int.Parse(o.Number["CMD-".Length..])).DefaultIfEmpty(1000).Max() + 1;
        _nextProduct = _products.Count + 1;
    }

    public IReadOnlyList<Order> ListOrders(OrderStatus? status = null, string? query = null)
    {
        var q = query?.Trim();
        lock (_lock)
        {
            return _orders
                .Where(o => status is null || o.Status == status)
                .Where(o => string.IsNullOrEmpty(q)
                    || o.Number.Contains(q, StringComparison.OrdinalIgnoreCase)
                    || o.CustomerName.Contains(q, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => o.Clone())
                .ToList();
        }
    }

    public Order GetOrder(string id)
    {
        lock (_lock)
        {
            return Find(id).Clone();
        }
    }

    public Order ChangeStatus(string id, OrderStatus status, DateTimeOffset now)
    {
        lock (_lock)
        {
            var order = Find(id);
            if (!OrderRules.CanTransition(order.Status, status))
            {
                throw new DomainException(409, $"Impossible de passer une commande {OrderRules.Label(order.Status)} à « {OrderRules.Label(status)} ».");
            }
            order.Status = status;
            order.UpdatedAt = now;
            return order.Clone();
        }
    }

    public Order AddRandomOrder(DateTimeOffset now)
    {
        lock (_lock)
        {
            var order = DemoData.RandomOrder(_random, _products, _nextOrder++, now, OrderStatus.Recue);
            _orders.Insert(0, order);
            return order.Clone();
        }
    }

    public IReadOnlyList<Product> ListProducts()
    {
        lock (_lock)
        {
            return _products.OrderBy(p => p.Category).ThenBy(p => p.Name).ToList();
        }
    }

    public Product CreateProduct(ProductInput input)
    {
        var clean = Validate(input);
        lock (_lock)
        {
            var product = new Product($"p{_nextProduct++}", clean.Name, clean.Category, clean.Price, clean.Available, clean.Description);
            _products.Add(product);
            return product;
        }
    }

    public Product UpdateProduct(string id, ProductInput input)
    {
        var clean = Validate(input);
        lock (_lock)
        {
            var index = _products.FindIndex(p => p.Id == id);
            if (index < 0) throw new DomainException(404, "Produit introuvable");
            var product = new Product(id, clean.Name, clean.Category, clean.Price, clean.Available, clean.Description);
            _products[index] = product;
            return product;
        }
    }

    public void DeleteProduct(string id)
    {
        lock (_lock)
        {
            if (_products.RemoveAll(p => p.Id == id) == 0) throw new DomainException(404, "Produit introuvable");
        }
    }

    private Order Find(string id) =>
        _orders.FirstOrDefault(o => o.Id == id) ?? throw new DomainException(404, "Commande introuvable");

    /// <summary>Validation côté serveur : le front valide aussi, mais l'API ne fait jamais confiance au client.</summary>
    public static ProductInput Validate(ProductInput input)
    {
        var name = input.Name?.Trim() ?? "";
        var category = input.Category?.Trim() ?? "";
        var description = string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim();

        if (name.Length is < 2 or > 60) throw new DomainException(400, "Le nom doit contenir entre 2 et 60 caractères.");
        if (category.Length == 0) throw new DomainException(400, "La catégorie est obligatoire.");
        if (input.Price is < 50 or > 1_000_000) throw new DomainException(400, "Le prix doit être compris entre 50 et 1 000 000 FCFA.");
        if (description is { Length: > 160 }) throw new DomainException(400, "La description fait 160 caractères au maximum.");

        return input with { Name = name, Category = category, Description = description };
    }
}
