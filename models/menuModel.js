// Menu model - defines the structure and validation
class Menu {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.image = data.image;
    this.position = data.position;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Validate menu data
  static validate(data) {
    const errors = [];

    // Check name
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Menu name is required and must be a string');
    } else if (data.name.trim().length < 2) {
      errors.push('Menu name must be at least 2 characters long');
    } else if (data.name.trim().length > 100) {
      errors.push('Menu name must not exceed 100 characters');
    }

    // Check image
    if (!data.image || typeof data.image !== 'string') {
      errors.push('Menu image is required');
    }

    // Check position (optional at this layer — controller decides
    // the valid range since it depends on how many menus exist)
    if (data.position !== undefined && data.position !== null && data.position !== '') {
      const posNum = parseInt(data.position, 10);
      if (isNaN(posNum) || posNum < 1 || !Number.isInteger(Number(data.position))) {
        errors.push('Position must be a positive whole number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize data before saving
  static sanitize(data) {
    const sanitized = {
      name: data.name?.trim(),
      image: data.image
    };

    if (data.position !== undefined && data.position !== null && data.position !== '') {
      sanitized.position = parseInt(data.position, 10);
    }

    return sanitized;
  }
}

module.exports = Menu;