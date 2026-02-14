// Category model - defines the structure and validation
class Category {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.image = data.image;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Validate category data
  static validate(data) {
    const errors = [];

    // Check name
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Category name is required and must be a string');
    } else if (data.name.trim().length < 2) {
      errors.push('Category name must be at least 2 characters long');
    } else if (data.name.trim().length > 100) {
      errors.push('Category name must not exceed 100 characters');
    }

    // Check image
    if (!data.image || typeof data.image !== 'string') {
      errors.push('Category image is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize data before saving
  static sanitize(data) {
    return {
      name: data.name?.trim(),
      image: data.image
    };
  }
}

module.exports = Category;