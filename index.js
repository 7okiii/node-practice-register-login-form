let http = require('http');
let url_obj = require('url');
let file_obj = require('fs');
let mysql_obj = require('mysql');
let formidable = require('formidable');
let mailer = require('nodemailer');

// counter for sending an email if someone tried to access with wrong number more than 3 times.
let counter = 0;

http.createServer((req,res) => {
    let req_url = url_obj.parse(req.url,true);
    let con = mysql_obj.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'tamwood'
    })
    con.connect((err) => {
        if (err) throw err;
        let query = req_url.query;

        // by taking query string, redirect user to register and login form
        switch (query.btn) {
            case "Register":
                file_obj.readFile('./pages/register.html',(err,data) => {
                    if (err) throw err;
                    res.writeHead(200,{'Content-Type':'text/html'});
                    res.write(data);
                    console.log('Register page');
                    return res.end();
                })    
            break;
            case "Login":
                file_obj.readFile('./pages/login.html',(err,data) => {
                    if (err) throw err;
                    res.writeHead(200,{'Content-Type':'text/html'});
                    res.write(data);
                    console.log('Login page');
                    return res.end();
                })    
            break;
            case "Home":
                file_obj.readFile('./pages/home.html',(err,data) => {
                    if (err) throw err;
                    res.writeHead(200,{'Content-Type':'text/html'});
                    res.write(data);
                    console.log('Home page');
                    return res.end();
                })    
            break;
        }

        // At first, show user a Home page
        switch (req_url.pathname) {
            case "/":
                file_obj.readFile('./pages/home.html',(err,data) => {
                    if (err) throw err;
                    res.writeHead(200,{'Content-Type':'text/html'});
                    res.write(data);
                    console.log('Home page');
                    return res.end();
                })
            break;

            // When register btn is clicked, then connect to database, and insert into database + send an email
            case "/register":
                let reg_data = new formidable.IncomingForm();
                reg_data.parse(req,(err,fields,files) => {
                    if (err) throw err;
                    if (fields.userName !== "" && fields.email !== "" && fields.password !== "") {
                        let reg_sql = `INSERT INTO users (user_name,email,password) VALUES ('${fields.userName}','${fields.email}','${fields.password}')`
                        con.query(reg_sql,(err,result) => {
                            if (err) throw err;
                            res.writeHead(200,{'Content-Type':'text/html'});
                            res.write("<h2 style='color: #2ecc71;'>You've been successfully registered!!</h2>");

                            // after registered, redirect user to home or login page by 2 submit btn below
                            res.write("<form action='form' method='get'><input type='submit' name='btn' value='Login'><input type='submit' name='btn' value='Home'></form>");
                            console.log(result);
                            return res.end();
                        })
                        let first_log_sql = `SELECT * FROM users WHERE user_name = '${fields.userName}'`

                        // select a value by User Name right away and show user an User ID by sending email
                        con.query(first_log_sql,(err,result) => {
                            if (err) throw err;
                            // send an email
                            let transporter = mailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: 'webdevnaoki@gmail.com',
                                    pass: 'tamtam2021'
                                }
                            });
                            let mailOptions = {
                                from: 'webdevnaoki@gmail.com',
                                to: `${fields.email}`,
                                subject: 'Registration',
                                text: `Thank you very much for registering! \n Your user name is ${fields.userName} and User ID is ${result[0].user_id}`
                            }
                            transporter.sendMail(mailOptions,(err,info) => {
                                if (err) throw err;
                                res.writeHead(200,{'Content-Type':'text/html'});

                                // ★★★★★ email is properly sending to user but this res.write is not working ★★★★★
                                // I tried just text without info.response but it was same
                                res.write(`Email has been sent ${info.response}`);

                                return res.end();
                            })        

                        })
                    } else {
                        res.writeHead(404,{'Content-Type':'text/html'});
                        res.write("<h2 style='color: #e74c3c;'>Please input all the information to register</h2>");
                        res.end();
                    }
                })
            break;   

            // if user clicked login, then select all data from the user by user_name and check if password matched.
            // I tried another way but result[0].password is the one only worked for me.
            // But I just take 1 row which index number = 0 so I hope this is okay.
            case "/login":
                let log_data = new formidable.IncomingForm();
                log_data.parse(req,(err,fields,files) => {
                    if (err) throw err;
                    let log_sql = `SELECT * FROM users WHERE user_name = '${fields.userName}'`
                    // "SELECT * FROM customers WHERE address = 'Park Lane 38'"
                    con.query(log_sql,(err,result) => {
                        if (err) throw err;
                        res.writeHead(200,{'Content-Type':'text/html'});
                        if (result[0].password === fields.password) {

                            // ★★★★★ ↓↓↓ I tried to redirect user to another page but this way did't work ★★★★★
                            // I just write welcome userName

                            // file_obj.readFile('./pages/success.html',(err,data) => {
                            //     if (err) throw err;
                            //     res.writeHead(200,{'Content-Type':'text/html'});
                            //     res.write(data);
                            //     console.log('Success page');
                            //     return res.end();
                            // })             

                            res.writeHead(200,{'Content-Type':'text/html'});
                            res.write(`<h1>Welcome <span style='color: #f39c12;'>${fields.userName}</span>!!</h1>`);
                            console.log('Success page');
                            // if successfully logged in, then counter will be 0
                            counter = 0;
                            console.log(counter);
                            return res.end();
                        } else {
                            res.writeHead(200,{'Content-Type':'text/html'});
                            res.write("<h2 style='color: #e74c3c;'>Your User Name or Password is wrong</h2>");
                            console.log('Wrong password');
                            counter ++;
                            console.log(counter);
                            res.end();
                        }
                        if (counter >= 3) {
                            // if counter reached 3 and more than 3, send an alert email
                            let transporter = mailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: 'webdevnaoki@gmail.com',
                                    pass: 'tamtam2021'
                                }
                            });
                            let mailOptions = {
                                from: 'webdevnaoki@gmail.com',
                                to: `${result[0].email}`,
                                subject: 'Warning',
                                text: `Password was wrong for 3 times in a row.`
                            }
                            transporter.sendMail(mailOptions,(err,info) => {
                                if (err) throw err;
                                res.writeHead(200,{'Content-Type':'text/html'});

                                // ★★★★★ email is properly sending to user but this res.write is not working ★★★★★
                                // I tried just text without info.response but it was same
                                res.write(`Email has been sent to your email address`);
                                
                                return res.end();
                            })        
    
                        }
                        return res.end();
                    })    
                })
            break;

            // ★★★★★ ↓↓↓ I wanted to set default but then I can't use another switch so I couldn't make it ★★★★★

            // default:
            //     res.writeHead(404,{'Content-Type':'text/html'});
            //     res.write('Page not found');
            //     res.end();
            // break;
        }        
    })            
}).listen(8080);