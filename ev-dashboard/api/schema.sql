-- EV Battery Fault Detection — MySQL Schema
-- Run once to set up the database

CREATE DATABASE IF NOT EXISTS ev_battery;
USE ev_battery;

-- Raw telemetry records (seeded from ev_data_sample.json)
CREATE TABLE IF NOT EXISTS telemetry (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  time_ms         INT            NOT NULL,
  voltage         DECIMAL(6,4)   NOT NULL,
  current         DECIMAL(6,4)   NOT NULL,
  temperature     DECIMAL(6,3)   NOT NULL,
  motor_speed_rpm INT            NOT NULL,
  hall_code       VARCHAR(10),
  estimated_soc   DECIMAL(7,4)   NOT NULL,
  ground_truth_soc DECIMAL(7,4)  NOT NULL,
  residual        DECIMAL(7,4)   NOT NULL,
  soc_error       DECIMAL(8,4)   NOT NULL,
  fault_label     ENUM('Normal','Warning','Fault') NOT NULL,
  rf_pred         ENUM('Normal','Warning','Fault') NOT NULL,
  xgb_pred        ENUM('Normal','Warning','Fault') NOT NULL,
  rf_prob_fault   DECIMAL(10,8),
  rf_prob_normal  DECIMAL(10,8),
  rf_prob_warning DECIMAL(10,8),
  xgb_prob_fault  DECIMAL(10,8),
  xgb_prob_normal DECIMAL(10,8),
  xgb_prob_warning DECIMAL(10,8),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fault_label (fault_label),
  INDEX idx_time_ms (time_ms)
);

-- Live predictor logs — persisted across sessions
CREATE TABLE IF NOT EXISTS prediction_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  voltage         DECIMAL(6,4)   NOT NULL,
  current         DECIMAL(6,4)   NOT NULL,
  temperature     DECIMAL(6,3)   NOT NULL,
  motor_speed_rpm INT            NOT NULL,
  estimated_soc   DECIMAL(7,4)   NOT NULL,
  ground_truth_soc DECIMAL(7,4)  NOT NULL,
  residual        DECIMAL(7,4)   NOT NULL,
  soc_error       DECIMAL(8,4)   NOT NULL,
  rf_pred         ENUM('Normal','Warning','Fault') NOT NULL,
  xgb_pred        ENUM('Normal','Warning','Fault') NOT NULL,
  logged_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logged_at (logged_at),
  INDEX idx_rf_pred (rf_pred)
);
