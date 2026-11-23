const { eventBus } = require('../events/eventBus');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access based on user role stored in JWT payload (e.g. 'admin', 'user')
 * @param  {...string} roles Allowed roles
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before role verification.'
      });
    }

    if (!roles.includes(req.user.role)) {
      eventBus.emit('security:forbidden_role', {
        path: req.originalUrl,
        username: req.user.username,
        role: req.user.role,
        requiredRoles: roles
      });

      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' does not have sufficient permissions to access this resource. Required role(s): [${roles.join(', ')}].`
      });
    }

    next();
  };
}

module.exports = authorizeRoles;
