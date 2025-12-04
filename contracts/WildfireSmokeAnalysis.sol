// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract WildfireSmokeAnalysis is SepoliaConfig {
    struct EncryptedSensorData {
        address agency;
        euint32 encryptedSmokeLevel; // Encrypted smoke concentration
        euint32 encryptedWindSpeed;  // Encrypted wind speed
        euint32 encryptedWindDirection; // Encrypted wind direction
        uint256 timestamp;
        uint256 locationId;
    }
    
    struct SmokePropagationModel {
        euint32 encryptedPrediction; // Encrypted smoke propagation prediction
        bool isComputed;
    }
    
    struct AirQualityAlert {
        string alertLevel;
        bool isRevealed;
    }

    // Contract state
    uint256 public dataCount;
    mapping(uint256 => EncryptedSensorData) public sensorData;
    mapping(uint256 => SmokePropagationModel) public propagationModels;
    mapping(uint256 => AirQualityAlert) public airQualityAlerts;
    
    // Location tracking
    mapping(uint256 => uint256[]) private locationData;
    
    // Decryption tracking
    mapping(uint256 => uint256) private requestToDataId;
    
    // Events
    event DataUploaded(uint256 indexed id, uint256 locationId);
    event ModelComputed(uint256 indexed locationId);
    event AlertGenerated(uint256 indexed locationId);
    event DecryptionRequested(uint256 indexed locationId);

    /// @notice Upload encrypted sensor data
    function uploadSensorData(
        euint32 encryptedSmokeLevel,
        euint32 encryptedWindSpeed,
        euint32 encryptedWindDirection,
        uint256 locationId
    ) public {
        dataCount++;
        uint256 newId = dataCount;
        
        sensorData[newId] = EncryptedSensorData({
            agency: msg.sender,
            encryptedSmokeLevel: encryptedSmokeLevel,
            encryptedWindSpeed: encryptedWindSpeed,
            encryptedWindDirection: encryptedWindDirection,
            timestamp: block.timestamp,
            locationId: locationId
        });
        
        // Track data by location
        locationData[locationId].push(newId);
        
        // Initialize models and alerts
        propagationModels[locationId] = SmokePropagationModel({
            encryptedPrediction: FHE.asEuint32(0),
            isComputed: false
        });
        
        airQualityAlerts[locationId] = AirQualityAlert({
            alertLevel: "",
            isRevealed: false
        });
        
        emit DataUploaded(newId, locationId);
    }

    /// @notice Compute smoke propagation model
    function computePropagationModel(uint256 locationId) public {
        require(locationData[locationId].length > 0, "No data for location");
        require(!propagationModels[locationId].isComputed, "Already computed");
        
        euint32 avgSmoke = FHE.asEuint32(0);
        euint32 avgWindSpeed = FHE.asEuint32(0);
        euint32 avgWindDirection = FHE.asEuint32(0);
        uint256 dataCount = locationData[locationId].length;
        
        // Calculate averages
        for (uint i = 0; i < dataCount; i++) {
            uint256 dataId = locationData[locationId][i];
            avgSmoke = FHE.add(avgSmoke, sensorData[dataId].encryptedSmokeLevel);
            avgWindSpeed = FHE.add(avgWindSpeed, sensorData[dataId].encryptedWindSpeed);
            avgWindDirection = FHE.add(avgWindDirection, sensorData[dataId].encryptedWindDirection);
        }
        
        // Compute averages
        avgSmoke = FHE.div(avgSmoke, FHE.asEuint32(uint32(dataCount)));
        avgWindSpeed = FHE.div(avgWindSpeed, FHE.asEuint32(uint32(dataCount)));
        avgWindDirection = FHE.div(avgWindDirection, FHE.asEuint32(uint32(dataCount)));
        
        // Simplified propagation model: prediction = smoke * wind speed
        propagationModels[locationId].encryptedPrediction = FHE.mul(avgSmoke, avgWindSpeed);
        propagationModels[locationId].isComputed = true;
        
        emit ModelComputed(locationId);
    }

    /// @notice Generate air quality alert
    function generateAirQualityAlert(uint256 locationId) public {
        require(propagationModels[locationId].isComputed, "Model not computed");
        
        // Prepare encrypted data for decryption
        bytes32[] memory ciphertexts = new bytes32[](1);
        ciphertexts[0] = FHE.toBytes32(propagationModels[locationId].encryptedPrediction);
        
        // Request decryption
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.generateAlertCallback.selector);
        requestToDataId[reqId] = locationId;
        
        emit DecryptionRequested(locationId);
    }

    /// @notice Handle alert generation callback
    function generateAlertCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 locationId = requestToDataId[requestId];
        require(locationId != 0, "Invalid request");
        
        AirQualityAlert storage alert = airQualityAlerts[locationId];
        require(!alert.isRevealed, "Alert already generated");
        
        FHE.checkSignatures(requestId, cleartexts, proof);
        
        uint32 prediction = abi.decode(cleartexts, (uint32));
        
        // Determine alert level based on prediction
        if (prediction > 8000) {
            alert.alertLevel = "Hazardous";
        } else if (prediction > 5000) {
            alert.alertLevel = "Very Unhealthy";
        } else if (prediction > 3000) {
            alert.alertLevel = "Unhealthy";
        } else if (prediction > 1000) {
            alert.alertLevel = "Moderate";
        } else {
            alert.alertLevel = "Good";
        }
        
        alert.isRevealed = true;
        
        emit AlertGenerated(locationId);
    }

    /// @notice Get encrypted propagation model
    function getEncryptedModel(uint256 locationId) public view returns (euint32) {
        require(propagationModels[locationId].isComputed, "Not computed");
        return propagationModels[locationId].encryptedPrediction;
    }

    /// @notice Get air quality alert
    function getAirQualityAlert(uint256 locationId) public view returns (string memory) {
        require(airQualityAlerts[locationId].isRevealed, "Not generated");
        return airQualityAlerts[locationId].alertLevel;
    }

    /// @notice Get data count for location
    function getLocationDataCount(uint256 locationId) public view returns (uint256) {
        return locationData[locationId].length;
    }
}