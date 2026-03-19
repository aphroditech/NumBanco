export const ok = (res, data) => res.json(data);
export const error = (res, status = 500, message = "Server error") => res.status(status).json({ message });

export const sendUserResponse = async (res, message, user, extra = {}) => {

    if (extra.token) {
        res.cookie("token", extra.token, {
            httpOnly: true,
            secure: false,
            maxAge: 3600000, // 1 hour in milliseconds
            sameSite: "Lax",
            path: "/"
        });
    }

    user.__v = Date.now();

    return res.json({
        message,
        ...extra,
        user: user
    });
};  