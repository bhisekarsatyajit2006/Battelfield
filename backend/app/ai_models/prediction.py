import numpy as np


class KalmanPredictor:
    def __init__(self):
        # state: [x, y, vx, vy]
        self.dt = 1

        self.A = np.array([
            [1, 0, self.dt, 0],
            [0, 1, 0, self.dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ])

        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ])

        self.Q = np.eye(4) * 0.01
        self.R = np.eye(2) * 1
        self.P = np.eye(4)

    def predict_path(self, path, steps=5):
        if len(path) < 2:
            return []

        x, y = path[-1]
        x_prev, y_prev = path[-2]

        vx = x - x_prev
        vy = y - y_prev

        state = np.array([[x], [y], [vx], [vy]])

        predicted = []

        for _ in range(steps):
            state = self.A @ state
            predicted.append((float(state[0, 0]), float(state[1, 0])))

        return predicted