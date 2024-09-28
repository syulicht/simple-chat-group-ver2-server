import { Prisma, PrismaClient, User } from "@prisma/client";
import express from "express";
import Cors from "cors"
import bcrypt from 'bcryptjs';
import passport from 'passport';
import session from 'express-session';
import {Strategy as LocalStrategy} from 'passport-local';

const app: express.Express = express();
const prisma = new PrismaClient();
const port = 8000;
const cors = Cors;

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({extended: false}));
app.use(express.json());

passport.use(new LocalStrategy(
    async (name: string, password: string, done: any) => {
        console.log(name, password);
        try{
            const user = await prisma.user.findFirstOrThrow({
                where: {name: name}
            });
            console.log(user);
            const match = await bcrypt.compare(password, user.password);
            console.log(match);
            if(!match){
                return done(null, false, {message: "invalid credentials"});
            }
            return done(null, user);
        } catch(e){
            console.log(e);
            return done(null, false, {message: "invalid credentials"});
        }
    }
));

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async(id: number, done) => {
    try{
        const user = await prisma.user.findFirstOrThrow({where: {id: id}});
        done(null, user);
    } catch(err){
        done(err);
    }
})

app.get("/api/get", async (req: express.Request, res: express.Response) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch(e) {
        res.status(400).json(e);
    }
});

app.post("/api/delete", async (req: express.Request, res: express.Response) => {
    try {
        const id : number = req.body.id;
        const users = await prisma.user.delete({
            where: {id : id}
        });
        res.json(users);
    } catch(e) {
        res.status(400).json(e);
    }
});

app.post("/api/add", async (req: express.Request, res: express.Response) => {
    try {
        const {data} = req.body;
        const hash = await bcrypt.hash(req.body.data.password, 10);
        data.password = hash;
        const users = await prisma.user.create({data});
        res.json(users);
    } catch(e) {
        res.status(400).json(e);
    }
});

app.post("/api/login", (req: express.Request, res: express.Response, next) => {
    console.log(req.body);
    passport.authenticate("local", (err : any, user : User, info : any) => {
        console.log(info);
        if (err) {
            return res.status(500).json({ message: "Internal Server Error" });
        }
        if (!user) {
            return res.status(401).json({ message: info.message });
        }
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ message: "Internal Server Error" });
            }
            return res.json({ message: 'Login successful', user });
        });
    })(req, res, next);});


app.listen(port, () => {
  console.log(`port ${port} でサーバー起動中`);
});