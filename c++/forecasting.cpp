#include <vector>
#include <numeric>
#include <iostream>
#include <tuple>
#include <utility>
using namespace std;

//Naive Forecasting
double naiveForecast(const vector<double>& data) {
    if (data.empty()) return 0.0;
    return data.back();
}

//Moving Average
double movingAverage(const vector<double>& data, int n) {
    if (data.size() < n) return 0.0;
    double sum = accumulate(data.end() - n, data.end(), 0.0);
    return sum / n;
}

//Weighted Moving Average
double weightedMovingAverage(const vector<double>& data, const vector<double>& weights) {
    if (data.size() < weights.size()) return 0.0;
    double weightedSum = 0.0;
    int n = weights.size();
    for (int i = 0; i < n; ++i) {
        weightedSum += data[data.size() - n + i] * weights[i];
    }
    double sumWeights = accumulate(weights.begin(), weights.end(), 0.0);
    return weightedSum / sumWeights;
}

//Simple Exponential Smoothing
double simpleExponentialSmoothing(const vector<double>& data, double alpha) {
    if (data.empty()) return 0.0;
    double forecast = data[0];
    for (size_t i = 1; i < data.size(); ++i) {
        forecast = alpha * data[i] + (1 - alpha) * forecast;
    }
    return forecast;
}

//Holt's Linear Trend Model
pair<double, double> holtLinear(const vector<double>& data, double alpha, double beta) {
    if (data.empty()) return {0.0, 0.0};
    double l = data[0];
    double b = 0.0;
    for (size_t i = 1; i < data.size(); ++i) {
        double newL = alpha * data[i] + (1 - alpha) * (l + b);
        b = beta * (newL - l) + (1 - beta) * b;
        l = newL;
    }
    return {l, b};
}

//Holt-Winters Seasonal Model (Additive)
tuple<double, double, vector<double>> holtWintersAdditive(
    const vector<double>& data, double alpha, double beta, double gamma, int seasonLength) {
    if (data.empty()) return {0.0, 0.0, {}};
    int seasons = data.size() / seasonLength;
    vector<double> seasonal(seasonLength, 0.0);
    double l = data[0], b = 0.0;
    for (int i = 0; i < seasonLength; ++i) {
        seasonal[i] = data[i] - l;
    }
    for (size_t t = seasonLength; t < data.size(); ++t) {
        double newL = alpha * (data[t] - seasonal[t % seasonLength]) + (1 - alpha) * (l + b);
        b = beta * (newL - l) + (1 - beta) * b;
        seasonal[t % seasonLength] = gamma * (data[t] - newL) + (1 - gamma) * seasonal[t % seasonLength];
        l = newL;
    }
    return {l, b, seasonal};
}

int main() {
    vector<double> data = {10.5, 12.0, 13.2, 15.0, 17.0, 20.0, 25.0};
    double alpha = 0.5, beta = 0.5, gamma = 0.5;
    int seasonLength = 3;
    
    auto hwResult = holtWintersAdditive(data, alpha, beta, gamma, seasonLength);
    cout << "Level: " << get<0>(hwResult) << ", Trend: " << get<1>(hwResult) << "\nSeasonal Components: ";
    for (double s : get<2>(hwResult)) {
        cout << s << " ";
    }
    cout << endl;
    return 0;
}