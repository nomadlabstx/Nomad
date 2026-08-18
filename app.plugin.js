/**
 * Expo Config Plugin for MapKit Native Modules
 * Ensures native iOS modules are included in the build
 */

const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Copy native Swift files to iOS project and add to Xcode project
 */
function withMapKitNativeModules(config) {
  // First, copy files to iOS project
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosPath = config.modRequest.platformProjectRoot;
      const sourceDir = path.join(__dirname, 'ios');
      const targetDir = path.join(iosPath, 'Nomad');
      
      // Only proceed if iOS project exists (after prebuild or EAS build)
      // On Windows, this won't exist locally, but EAS Build will handle it
      if (!fs.existsSync(iosPath)) {
        console.log('iOS project not found. Files will be included during EAS Build.');
        return config;
      }
      
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copy Swift files
      const swiftFiles = ['MapKitDirections.swift', 'MapKitGeocoding.swift'];
      for (const file of swiftFiles) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`✅ Copied ${file} to iOS project`);
        }
      }
      
      // Copy bridge file
      const bridgeFile = 'MapKitBridge.m';
      const bridgeSource = path.join(sourceDir, bridgeFile);
      const bridgeTarget = path.join(targetDir, bridgeFile);
      
      if (fs.existsSync(bridgeSource)) {
        fs.copyFileSync(bridgeSource, bridgeTarget);
        console.log(`✅ Copied ${bridgeFile} to iOS project`);
      }
      
      return config;
    },
  ]);

  // Then, add files to Xcode project
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectPath = config.modRequest.platformProjectRoot;
    const targetDir = path.join(projectPath, 'Nomad');
    
    if (!fs.existsSync(targetDir)) {
      return config;
    }

    // Add Swift files to Xcode project
    const swiftFiles = ['MapKitDirections.swift', 'MapKitGeocoding.swift'];
    swiftFiles.forEach((file) => {
      const filePath = path.join(targetDir, file);
      if (fs.existsSync(filePath)) {
        xcodeProject.addSourceFile(filePath, {
          target: xcodeProject.getFirstTarget().uuid,
        });
      }
    });

    // Add bridge file to Xcode project
    const bridgeFile = path.join(targetDir, 'MapKitBridge.m');
    if (fs.existsSync(bridgeFile)) {
      xcodeProject.addSourceFile(bridgeFile, {
        target: xcodeProject.getFirstTarget().uuid,
      });
    }

    return config;
  });

  return config;
}

module.exports = withMapKitNativeModules;

