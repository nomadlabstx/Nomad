/**
 * Error Message Utilities
 * Provides user-friendly error messages with recovery suggestions
 */

export interface ErrorInfo {
  title: string;
  message: string;
  suggestions: string[];
  actionLabel?: string;
  action?: () => void;
}

/**
 * Convert technical errors to user-friendly messages
 */
export function getErrorMessage(error: unknown): ErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Network errors
  if (errorString.includes('network') || errorString.includes('fetch') || errorString.includes('timeout')) {
    return {
      title: 'Connection Problem',
      message: 'Unable to connect to the internet. Please check your connection and try again.',
      suggestions: [
        'Check your Wi-Fi or mobile data connection',
        'Try again in a few moments',
        'Move to an area with better signal',
      ],
      actionLabel: 'Retry',
    };
  }

  // Location errors
  if (errorString.includes('location') || errorString.includes('permission') || errorString.includes('gps')) {
    return {
      title: 'Location Access Required',
      message: 'Nomad needs access to your location to provide navigation.',
      suggestions: [
        'Enable location services in your device settings',
        'Grant location permissions when prompted',
        'Make sure GPS is enabled',
      ],
      actionLabel: 'Open Settings',
    };
  }

  // Route calculation errors
  if (errorString.includes('route') || errorString.includes('directions') || errorString.includes('waypoint')) {
    return {
      title: 'Route Calculation Failed',
      message: 'Unable to calculate a route to your destination.',
      suggestions: [
        'Check that your destination address is correct',
        'Try a different destination',
        'Make sure you have an internet connection',
      ],
      actionLabel: 'Try Again',
    };
  }

  // API key errors
  if (errorString.includes('api key') || errorString.includes('authentication') || errorString.includes('403') || errorString.includes('401')) {
    return {
      title: 'Service Configuration Error',
      message: 'There\'s an issue with the app configuration. This may require an app update.',
      suggestions: [
        'Check for app updates',
        'Restart the app',
        'Contact support if the problem persists',
      ],
    };
  }

  // Storage errors
  if (errorString.includes('storage') || errorString.includes('save') || errorString.includes('asyncstorage')) {
    return {
      title: 'Storage Error',
      message: 'Unable to save data. Your device may be low on storage space.',
      suggestions: [
        'Free up storage space on your device',
        'Restart the app',
        'Try again later',
      ],
      actionLabel: 'Retry',
    };
  }

  // Generic error
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. We\'re sorry for the inconvenience.',
    suggestions: [
      'Try again in a moment',
      'Restart the app if the problem persists',
      'Contact support if you continue to see this error',
    ],
    actionLabel: 'Try Again',
  };
}

/**
 * Get error message for specific error types
 */
export function getSpecificErrorMessage(type: string, details?: string): ErrorInfo {
  switch (type) {
    case 'NO_LOCATION':
      return {
        title: 'Location Not Available',
        message: 'Unable to determine your current location.',
        suggestions: [
          'Make sure location services are enabled',
          'Move to an area with better GPS signal',
          'Wait a few seconds and try again',
        ],
        actionLabel: 'Retry',
      };

    case 'ROUTE_NOT_FOUND':
      return {
        title: 'Route Not Found',
        message: 'No route could be found between your locations.',
        suggestions: [
          'Check that both locations are accessible by road',
          'Try adjusting your destination',
          'Some locations may require walking or public transit',
        ],
        actionLabel: 'Try Different Route',
      };

    case 'DESTINATION_INVALID':
      return {
        title: 'Invalid Destination',
        message: 'The destination you entered could not be found.',
        suggestions: [
          'Check the spelling of your destination',
          'Try a more specific address',
          'Use a landmark or business name',
        ],
        actionLabel: 'Search Again',
      };

    case 'PERMISSION_DENIED':
      return {
        title: 'Permission Denied',
        message: 'Nomad needs permission to access this feature.',
        suggestions: [
          'Go to Settings and enable the required permission',
          'Restart the app after enabling permissions',
        ],
        actionLabel: 'Open Settings',
      };

    default:
      return getErrorMessage(new Error(details || type));
  }
}

