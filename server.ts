import { Prisma, PrismaClient, User } from "@prisma/client";
import express from "express";
import Cors from "cors"
import bcrypt from 'bcryptjs';
import passport, { authenticate } from 'passport';
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
app.use(express.urlencoded({extended: false}));
app.use(express.json());

passport.use(new LocalStrategy({
        usernameField: 'name',
        passwordField: 'password',
        session: true,
        passReqToCallback: false,

    },
    async(name: string, password: string, done: any) => {
        console.log("localstrategy");
        try{
            const user = await prisma.user.findFirstOrThrow({
                where: {name: name}
            });
            const match = await bcrypt.compare(password, user.password);
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

app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

const isAuthenticated = (req : express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized" });
};

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

app.post("/api/login", passport.authenticate('local'), (req : express.Request, res : express.Response, next) => {
    res.json({ok: true});
});


app.get("/api/chatSpace/group/get/fromUser", isAuthenticated, async(req : express.Request, res : express.Response, next) => {
    try {
        const userId = (req.user as User).id;
        console.log(userId);
        const groups = await prisma.group.findMany({
            where : {users : {some: {id: userId}}}
        });
        const data = {groups : groups, ok: true};
        console.log(data);
        res.json(data);
    } catch (e) {
        res.status(400).json({ error: e });
    }})

    app.get("/api/chatSpace/chat/get/fromGroup", isAuthenticated, async(req : express.Request, res : express.Response, next) => {
        try {
            const userId = (req.user as User).id;
            console.log(userId);
            const groups = await prisma.group.findMany({
                where : {users : {some: {id: userId}}}
            });
            const data = {groups : groups, ok: true};
            console.log(data);
            res.json(data);
        } catch (e) {
            res.status(400).json({ error: e });
        }})    

app.listen(port, () => {
  console.log(`port ${port} でサーバー起動中`);
});