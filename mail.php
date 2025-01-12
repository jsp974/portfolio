<?php 
if (isset($_POST['email']) && isset[$_POST['message']] && isset[$_POST['name']]) {
    mail("hugo@bertrand.re", $_POST['message'] . " " . $_POST['email'], isset[$_POST['message']]);
} 

$url = "https://jsp974.github.io/portfolio/"

if (isset[$_POST['url']]) {
    $url = $_POST['url'];
}

header("Location: $url");
exit();