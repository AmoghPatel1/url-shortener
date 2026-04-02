The Builder pattern in Java is a powerful creational design pattern used to construct complex objects step by step.  It separates the construction logic from the object's final representation, enabling the same construction process to create different representations.

### Core Implementation
The standard implementation uses a static nested Builder class within the target class.  The target class has a private constructor that accepts the builder, ensuring objects can only be created through the builder. The builder's setter methods return this, enabling method chaining for a fluent, readable API.

```
    User user = new User.UserBuilder("John", "Doe")
    .age(30)
    .phone("123-456-7890")
    .address("123 Main St")
    .build();
```

### Key Benefits
* Immutability: The final object is immutable, created in a single step, preventing inconsistent states.
* Readability: Method chaining creates clear, self-documenting code, especially with many parameters.
* Flexibility: Handles numerous optional parameters cleanly, avoiding telescoping constructors.
* Validation: The build() method can perform validation before object creation.

### Best Practices
* Use for Complex Objects: Reserve the pattern for classes with many (especially optional) parameters.
* Static Inner Class: Make the builder a static nested class for encapsulation.
* Sensible Defaults: Initialize optional fields with reasonable defaults in the builder.
* Static Factory Method: Provide a method like builder() for a cleaner client API (e.g., User.builder(...)).
* Leverage Lombok: Use the @Builder annotation from Project Lombok to eliminate boilerplate code.